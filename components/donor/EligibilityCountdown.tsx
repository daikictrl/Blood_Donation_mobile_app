import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { parseISO, addDays, differenceInSeconds } from 'date-fns';

interface EligibilityCountdownProps {
  lastDonationDate: string;
  onComplete: () => void;
}

export function EligibilityCountdown({ lastDonationDate, onComplete }: EligibilityCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isComplete: false,
  });

  useEffect(() => {
    const targetDate = addDays(parseISO(lastDonationDate), 30);

    const calculateTime = () => {
      const now = new Date();
      const diffSeconds = differenceInSeconds(targetDate, now);

      if (diffSeconds <= 0) {
        setTimeLeft((prev) => ({ ...prev, isComplete: true }));
        onComplete();
        return true;
      }

      const days = Math.floor(diffSeconds / (3600 * 24));
      const hours = Math.floor((diffSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      const seconds = diffSeconds % 60;

      setTimeLeft({ days, hours, minutes, seconds, isComplete: false });
      return false;
    };

    // Run immediately
    const done = calculateTime();
    if (done) return;

    const timer = setInterval(() => {
      const done = calculateTime();
      if (done) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastDonationDate]);

  if (timeLeft.isComplete) {
    return null;
  }

  // Format as inline ticker string: "24d : 12h : 30m : 45s"
  const formattedTime = `${timeLeft.days}d : ${String(timeLeft.hours).padStart(2, '0')}h : ${String(timeLeft.minutes).padStart(2, '0')}m : ${String(timeLeft.seconds).padStart(2, '0')}s`;

  return (
    <Text className="font-bold text-warning">
      {formattedTime}
    </Text>
  );
}
