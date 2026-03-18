/**
 * ID Vault Type Definitions
 */

export type IDType = 
  | "PAN"
  | "Aadhaar"
  | "Passport"
  | "Driving License"
  | "Voter ID"
  | "Employee ID"
  | "Student ID"
  | "Other";

export interface IDAsset {
  id: string;
  uri: string;           // Path to encrypted image file (.enc)
  thumbnailUri: string;  // Path to thumbnail image file (not encrypted for performance)
  width: number;
  height: number;
  size: number;
  createdAt: number;     // Unix timestamp
}

export interface IDDocument {
  id: string;
  type: IDType;
  label: string;         // User-defined or default label
  idNumber?: string;     // Optional ID number
  assets: IDAsset[];     // Max 2 images
  createdAt: number;
  isPinned?: boolean;
}

export const ID_TYPES: IDType[] = [
  "PAN",
  "Aadhaar",
  "Passport",
  "Driving License",
  "Voter ID",
  "Employee ID",
  "Student ID",
  "Other"
];

export const ID_STORAGE_KEYS = {
  METADATA: "id_vault_metadata",
  IMAGES_DIR: "ids/",
} as const;
