export type AlertType = 'SLASH_INCREASE' | 'JAIL' | 'CHURN_RISK' | 'NODE_STATUS_CHANGE';

export interface AlertPreferences {
  slashAlerts: boolean;
  jailAlerts: boolean;
  churnAlerts: boolean;
  statusAlerts: boolean;
}

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  slashAlerts: true,
  jailAlerts: true,
  churnAlerts: true,
  statusAlerts: true,
};

export type AlertPreferenceInput = Partial<Record<keyof AlertPreferences, unknown>>;

function booleanPreference(
  preferences: AlertPreferenceInput | null | undefined,
  key: keyof AlertPreferences
): boolean {
  return typeof preferences?.[key] === 'boolean'
    ? preferences[key]
    : DEFAULT_ALERT_PREFERENCES[key];
}

export function mergeAlertPreferences(preferences?: AlertPreferenceInput | null): AlertPreferences {
  return {
    slashAlerts: booleanPreference(preferences, 'slashAlerts'),
    jailAlerts: booleanPreference(preferences, 'jailAlerts'),
    churnAlerts: booleanPreference(preferences, 'churnAlerts'),
    statusAlerts: booleanPreference(preferences, 'statusAlerts'),
  };
}
