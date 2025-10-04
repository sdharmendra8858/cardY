import { Tabs, useRouter } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      {/* <Tabs.Screen
        name="add-card"
        options={{
          title: "Add Card",
          tabBarIcon: ({ color }) => <IconSymbol name="creditcard" color={color} size={28} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault(); // Prevent the default tab navigation
            router.push("/add-card"); // Push the stack screen instead
          },
        }}
      /> */}
    </Tabs>
  );
}
