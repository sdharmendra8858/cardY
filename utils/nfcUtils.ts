import NfcManager, { NfcEvents, NfcTech } from 'react-native-nfc-manager';

// EMV Constants
const AIDS = [
    { name: 'Visa', id: 'A0000000031010' },
    { name: 'MasterCard', id: 'A0000000041010' },
    { name: 'Maestro', id: 'A0000000043060' },
    { name: 'RuPay', id: 'A0000005241010' },
    { name: 'Amex', id: 'A000000025010801' },
    { name: 'JCB', id: 'A0000000651010' },
    { name: 'Discover', id: 'A0000001523010' },
    { name: 'Diners Club', id: 'A0000001524010' },
    { name: 'Diners Club (Intl)', id: 'A0000001523010' }, // Shared with Discover
    { name: 'Diners Club (Alt)', id: 'A0000001884443' },
    { name: 'EnRoute', id: 'A0000000036010' }
];

function toHex(bytes: number[]): string {
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function fromHex(hex: string): number[] {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

function decodeHex(hex: string): string {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        const charCode = parseInt(hex.substr(i, 2), 16);
        if (charCode >= 32 && charCode <= 126) {
            str += String.fromCharCode(charCode);
        }
    }
    return str.trim();
}

export async function readNfcCard() {
    try {
        console.log('EMV: Setting up tag listener...');
        NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag: any) => {
            console.log('EMV: Tag Discovered via Event Listener:', JSON.stringify(tag, null, 2));
        });

        console.log('EMV: Requesting IsoDep & NfcA technologies...');
        await NfcManager.requestTechnology([NfcTech.IsoDep, NfcTech.NfcA]);
        
        console.log('EMV: Technology acquired. Fetching tag...');
        const tag = await NfcManager.getTag();
        console.log('EMV: Full Tag Data:', JSON.stringify(tag, null, 2));
        
        const hasIsoDep = tag?.techTypes?.some((t: string) => t.toLowerCase().includes('isodep'));
        if (!hasIsoDep) {
            console.warn('EMV: Tag found but does not support IsoDep.');
            return null;
        }

        // 1. Try PPSE (Proximity Payment System Environment) for discovery
        console.log('EMV: Attempting to select PPSE (2PAY.SYS.DDF01)...');
        try {
            const ppseAid = '325041592E5359532E4444463031';
            const ppseResponse = await NfcManager.isoDepHandler.transceive(
                [0x00, 0xA4, 0x04, 0x00, ppseAid.length / 2, ...fromHex(ppseAid), 0x00]
            );
            const hexPpse = toHex(ppseResponse);
            console.log('EMV: PPSE Response:', hexPpse);

            if (hexPpse.endsWith('9000')) {
                console.log('EMV: PPSE Success! Discovered Applications:');
                // Extract all AIDs (Tag 4F) from PPSE response
                const aidMatches = hexPpse.matchAll(/4F([0-9A-F]{2})([0-9A-F]+)/g);
                for (const match of aidMatches) {
                    const len = parseInt(match[1], 16);
                    const aid = match[2].slice(0, len * 2);
                    console.log(`  - Found AID: ${aid}`);
                }
            }
        } catch (e) {
            console.warn('EMV: PPSE Selection failed (this is common for some cards):', e);
        }

        // 2. Select Payment Application
        let hexSelect = '';
        let appLabel = '';
        let hexGpo = '';
        
        console.log('EMV: Starting AID selection loop...');
        for (const aid of AIDS) {
            console.log(`EMV: Attempting to select ${aid.name} AID (${aid.id})...`);
            try {
                // Added 0x00 (Le) at the end to satisfy cards expecting it
                const selectResponse = await NfcManager.isoDepHandler.transceive(
                    [0x00, 0xA4, 0x04, 0x00, aid.id.length / 2, ...fromHex(aid.id), 0x00]
                );
                hexSelect = toHex(selectResponse);
                console.log(`EMV: Selection Response for ${aid.name}: ${hexSelect}`);
                
                if (hexSelect.endsWith('9000')) {
                    console.log(`EMV: Successfully selected ${aid.name}! extracted FCI:`, hexSelect);
                    
                    // Extract App Label
                    const labelMatch = hexSelect.match(/50([0-9A-F]{2})([0-9A-F]+)/);
                    if (labelMatch) {
                        const len = parseInt(labelMatch[1], 16);
                        appLabel = decodeHex(labelMatch[2].slice(0, len * 2));
                    }

                    // 3. GPO (Get Processing Options)
                    let gpoCommand = [0x80, 0xA8, 0x00, 0x00, 0x02, 0x83, 0x00]; 
                    
                    const pdolMatch = hexSelect.match(/9F38([0-9A-F]{2})([0-9A-F]+)/);
                    if (pdolMatch) {
                        const pdolData = pdolMatch[2].slice(0, parseInt(pdolMatch[1], 16) * 2);
                        const terminalData: { [key: string]: string } = {
                            '9F66': '36004000', '9F02': '000000000000', '9F03': '000000000000',
                            '9F1A': '0356', '5F2A': '0356', '9C': '00', '9F37': '12345678',
                            '9A': new Date().toISOString().slice(2, 10).replace(/-/g, '')
                        };
                        
                        let pdolResp = '';
                        for (let i = 0; i < pdolData.length; ) {
                            let tag = pdolData.substr(i, 2); i += 2;
                            if ((parseInt(tag, 16) & 0x1F) === 0x1F) { tag += pdolData.substr(i, 2); i += 2; }
                            const len = parseInt(pdolData.substr(i, 2), 16); i += 2;
                            pdolResp += (terminalData[tag] || '00'.repeat(len)).padEnd(len * 2, '0').slice(0, len * 2);
                        }
                        
                        const pdolBytes = fromHex(pdolResp);
                        gpoCommand = [0x80, 0xA8, 0x00, 0x00, pdolBytes.length + 2, 0x83, pdolBytes.length, ...pdolBytes];
                    }

                    let hexGpoResult = '';
                    try {
                        const gpoResponse = await NfcManager.isoDepHandler.transceive(gpoCommand);
                        hexGpoResult = toHex(gpoResponse);
                        
                        if (hexGpoResult.startsWith('6700')) {
                            const gpoResponseWithLe = await NfcManager.isoDepHandler.transceive([...gpoCommand, 0x00]);
                            hexGpoResult = toHex(gpoResponseWithLe);
                        }
                    } catch (e: any) {
                        const errorMsg = e.toString().toLowerCase();
                        if (errorMsg.includes('transceive fail') || errorMsg.includes('closed') || errorMsg.includes('lost')) {
                            throw new Error('CONNECTION_LOST');
                        }
                        
                        try {
                            const gpoResponseWithLe = await NfcManager.isoDepHandler.transceive([...gpoCommand, 0x00]);
                            hexGpoResult = toHex(gpoResponseWithLe);
                        } catch (e2: any) {
                            const e2Msg = e2.toString().toLowerCase();
                            if (e2Msg.includes('transceive fail') || e2Msg.includes('closed') || e2Msg.includes('lost')) {
                                throw new Error('CONNECTION_LOST');
                            }
                        }
                    }

                    if (hexGpoResult.endsWith('9000')) {
                        hexGpo = hexGpoResult;
                        break; 
                    }
                }
            } catch (err: any) {
                const errMsg = err.toString().toLowerCase();
                if (errMsg.includes('connection_lost')) throw err; // Re-throw
                if (errMsg.includes('transceive fail') || errMsg.includes('closed') || errMsg.includes('lost')) {
                    throw new Error('CONNECTION_LOST');
                }
                console.warn(`EMV: Selection failed for ${aid.name}:`, err);
            }
        }

        if (!hexGpo || !hexGpo.endsWith('9000')) {
            return null;
        }

        let cardNumber = '';
        let expiry = '';
        let cardHolder = '';

        // 4. Try Extracting PAN/Expiry from GPO Response (Priority for early data)
        const gpoDetails = parseEMVDetails(hexGpo);
        if (gpoDetails.cardNumber) {
            cardNumber = gpoDetails.cardNumber;
            console.log('EMV: Found PAN from GPO:', cardNumber);
        }
        if (gpoDetails.expiry) {
            expiry = gpoDetails.expiry;
            console.log('EMV: Found Expiry from GPO:', expiry);
        }

        // 5. Extract AFL (Application File Locator)
        let aflHex = '';
        const aflMatch1 = hexGpo.match(/^80([0-9A-F]{2})[0-9A-F]{4}([0-9A-F]+)9000$/);
        if (aflMatch1) {
            aflHex = aflMatch1[2];
        } else {
            const aflMatch2 = hexGpo.match(/94([0-9A-F]{2})([0-9A-F]+)/);
            if (aflMatch2) {
                const len = parseInt(aflMatch2[1], 16);
                aflHex = aflMatch2[2].slice(0, len * 2);
            }
        }

        if (aflHex && (!cardNumber || !expiry)) {
            console.log('EMV: Found AFL, reading records:', aflHex);
            for (let i = 0; i < aflHex.length; i += 8) {
                const entry = aflHex.substr(i, 8);
                const sfi = parseInt(entry.substr(0, 2), 16) >> 3;
                const first = parseInt(entry.substr(2, 2), 16);
                const last = parseInt(entry.substr(4, 2), 16);

                for (let rec = first; rec <= last; rec++) {
                    const recordDetails = await readRecord(sfi, rec);
                    if (recordDetails) {
                        if (!cardNumber) cardNumber = recordDetails.cardNumber;
                        if (!expiry) expiry = recordDetails.expiry;
                    }
                    if (cardNumber && expiry) break;
                }
                if (cardNumber && expiry) break;
            }
        }

        // Fallback: Smart Scan
        if (!cardNumber || !expiry) {
            console.log('EMV: Data missing, starting Smart Fallback Scan...');
            for (let sfi = 1; sfi <= 2; sfi++) {
                for (let rec = 1; rec <= 5; rec++) {
                    const recordDetails = await readRecord(sfi, rec);
                    if (recordDetails) {
                        if (!cardNumber) cardNumber = recordDetails.cardNumber;
                        if (!expiry) expiry = recordDetails.expiry;
                    }
                    if (cardNumber && expiry) break;
                }
                if (cardNumber && expiry) break;
            }
        }

        async function readRecord(sfi: number, rec: number) {
            try {
                const response = await NfcManager.isoDepHandler.transceive(
                    [0x00, 0xB2, rec, (sfi << 3) | 4, 0x00]
                );
                const hex = toHex(response);
                if (hex.endsWith('9000')) {
                    return parseEMVDetails(hex);
                }
            } catch (e: any) {
                const errorMsg = e.toString().toLowerCase();
                if (errorMsg.includes('transceive fail') || errorMsg.includes('closed') || errorMsg.includes('lost')) {
                    throw new Error('CONNECTION_LOST');
                }
            }
            return null;
        }

        if (cardNumber) {
            return { cardNumber, expiry, cardHolder, appLabel };
        }

        console.warn('EMV: Could not find valid PAN record.');
        return null;

    } catch (ex: any) {
        if (ex.message === 'CONNECTION_LOST') throw ex;
        console.warn('EMV: NFC Read Exception (Expected on cancel):', ex.message || ex);
        return null;
    } finally {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
        await NfcManager.cancelTechnologyRequest().catch(() => {});
    }
}

/**
 * Helper to parse PAN and Expiry from raw hex data (GPO or Records)
 */
function parseEMVDetails(hex: string): { cardNumber: string; expiry: string } {
    let cardNumber = '';
    let expiry = '';

    // Extract PAN (Tag 5A)
    const panMatch = hex.match(/5A([0-8][0-9A-F])([0-9A-F]+)/);
    if (panMatch) {
        const len = parseInt(panMatch[1], 16);
        let pan = panMatch[2].slice(0, len * 2);
        pan = pan.replace(/F+$/, '');
        if (pan.length >= 13 && pan.length <= 19) {
            cardNumber = pan;
        }
    }

    // Extract Expiry (Tag 5F24)
    const expMatch = hex.match(/5F2403([0-9A-F]{6})/);
    if (expMatch) {
        const raw = expMatch[1];
        expiry = `${raw.slice(2, 4)}/${raw.slice(0, 2)}`;
    }

    // Track 2 Equivalent Data (Tag 57) - Best Source for many cards
    const track2Match = hex.match(/57([0-9A-F]{2})([0-9A-F]+)/);
    if (track2Match) {
        const len = parseInt(track2Match[1], 16);
        const content = track2Match[2].slice(0, len * 2);
        const separatorIndex = content.indexOf('D');
        if (separatorIndex !== -1) {
            if (!cardNumber) {
                cardNumber = content.slice(0, separatorIndex).replace(/F+$/, '');
            }
            if (!expiry) {
                const rawExp = content.slice(separatorIndex + 1, separatorIndex + 5);
                expiry = `${rawExp.slice(2, 4)}/${rawExp.slice(0, 2)}`;
            }
        }
    }

    return { cardNumber, expiry };
}
