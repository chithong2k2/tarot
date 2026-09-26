import { useState, useEffect } from 'react';

const PRIVACY_STORAGE_KEY = 'tarot_privacy_mode';
const PRIVACY_EVENT_NAME = 'tarot_privacy_toggle';

export function getPrivacyMode(): boolean {
  try {
    return localStorage.getItem(PRIVACY_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPrivacyMode(enabled: boolean): void {
  try {
    localStorage.setItem(PRIVACY_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent(PRIVACY_EVENT_NAME, { detail: enabled }));
  } catch (e) {
    console.error("Error setting privacy mode:", e);
  }
}

export function usePrivacyMode(): [boolean, (val: boolean) => void] {
  const [isPrivacy, setIsPrivacy] = useState<boolean>(getPrivacyMode);

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setIsPrivacy(customEvent.detail ?? getPrivacyMode());
    };

    window.addEventListener(PRIVACY_EVENT_NAME, handleToggle);
    window.addEventListener('storage', handleToggle);

    return () => {
      window.removeEventListener(PRIVACY_EVENT_NAME, handleToggle);
      window.removeEventListener('storage', handleToggle);
    };
  }, []);

  const updatePrivacy = (val: boolean) => {
    setIsPrivacy(val);
    setPrivacyMode(val);
  };

  return [isPrivacy, updatePrivacy];
}

export function maskMoney(formattedAmount: string | number, isPrivacy: boolean): string {
  if (isPrivacy) {
    return '•••••• ₫';
  }
  return typeof formattedAmount === 'number' 
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formattedAmount)
    : formattedAmount;
}
