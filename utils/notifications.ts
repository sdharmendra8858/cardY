import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { Card } from '../context/CardContextWithMigration';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Configure Android channel for high-importance notifications (required for banners)
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('expiry-notifications', {
    name: 'Card Expiration Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    if (__DEV__) console.warn('❌ Notification permissions not granted');
    return false;
  }
  
  // Also check if we need to request for Android 13+ explicitly
  if (Platform.OS === 'android') {
     const { status: androidStatus } = await Notifications.getPermissionsAsync();
     if (androidStatus !== 'granted') {
       await Notifications.requestPermissionsAsync();
     }
  }

  return true;
}

/**
 * Schedule a notification for when a card expires
 */
export async function scheduleCardExpirationNotification(card: Card) {
  if (!card.cardExpiresAt || card.cardUser !== 'other') return;

  // Cancel any existing notification for this card ID to avoid duplicates on update
  await cancelCardExpirationNotification(card.id);

  const expirationDate = new Date(card.cardExpiresAt * 1000);
  const now = new Date();

  // If already expired, don't schedule
  if (expirationDate <= now) return;

  const last4 = card.cardNumber ? card.cardNumber.slice(-4) : '****';
  const bankInfo = card.bank ? `from ${card.bank}` : '';

  try {
    const bankPrefix = card.bank ? `from ${card.bank} ` : '';
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "💳 Card Expired",
        body: `The shared card ${bankPrefix}ending in ${last4} has expired and been removed.`,
        data: { cardId: card.id },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        // @ts-ignore - channelId is supported but might not be in the base type depending on version
        channelId: 'expiry-notifications',
      },
      trigger: {
        date: expirationDate,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      } as Notifications.DateTriggerInput,
    });

    if (__DEV__) {
        console.log(`🔔 Scheduled expiration notification for "${card.cardName}" at ${expirationDate.toLocaleString()} (UNIX: ${card.cardExpiresAt})`);
        console.log(`🆔 Notification ID: ${identifier}`);
    }
    
    return identifier;
  } catch (error) {
    console.error('❌ Failed to schedule notification:', error);
  }
}

/**
 * Log all currently scheduled notifications for debugging
 */
export async function logScheduledNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  console.log(`📋 Total scheduled notifications: ${scheduled.length}`);
  scheduled.forEach((notif, i) => {
    console.log(`  ${i+1}. [${notif.identifier}] Title: ${notif.content.title}, Trigger: ${JSON.stringify(notif.trigger)}`);
  });
}

/**
 * Cancel a notification for a specific card
 */
export async function cancelCardExpirationNotification(cardId: string) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(notif => notif.content.data?.cardId === cardId);
    
    for (const notif of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
    
    if (__DEV__ && toCancel.length > 0) {
      console.log(`🔕 Cancelled ${toCancel.length} notification(s) for card: ${cardId}`);
    }
  } catch (error) {
    console.error('❌ Failed to cancel notification:', error);
  }
}

/**
 * Schedule notifications for all "other" cards that have expiration dates
 */
export async function syncAllCardExpirationNotifications(cards: Card[]) {
  const otherCards = cards.filter(c => c.cardUser === 'other' && c.cardExpiresAt);
  
  // First, cancel all existing ones to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  for (const card of otherCards) {
    await scheduleCardExpirationNotification(card);
  }
}

/**
 * Setup notification listeners for foreground handling
 */
export function setupNotificationListeners() {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    if (__DEV__) console.log('🔔 Foreground notification received:', notification.request.content.title);
    
    // Show a Toast when a notification is received in foreground
    Toast.show({
      type: 'info',
      text1: notification.request.content.title || 'Notification',
      text2: notification.request.content.body || '',
      visibilityTime: 6000,
    });
  });

  return () => subscription.remove();
}
