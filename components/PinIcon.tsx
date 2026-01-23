import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";

interface PinIconProps {
    filled?: boolean;
    size?: number;
    color?: string;
}

export const PinIcon: React.FC<PinIconProps> = ({ filled = false, size = 20, color = "#fff" }) => {
    return (
        <MaterialCommunityIcons
            name={filled ? "pin" : "pin-outline"}
            size={size}
            color={color}
        />
    );
};

export default PinIcon;
