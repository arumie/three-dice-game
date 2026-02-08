import { signal } from "@preact/signals-react";

/** Whether the game rules dialog is open (allows opening from any component) */
export const gameRulesOpen = signal(false);

/** Whether the MobileGameDrawer is mounted (hides the layout-level mobile toolbar) */
export const hasGameDrawer = signal(false);
