import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { todayLocalDate } from '../lib/dateUtils';

type DiaryDateContextValue = {
  date: string;
  setDate: (date: string) => void;
};

// The day shown in the food diary. Shared so "Log Food" adds to that day, not
// always today.
const DiaryDateContext = createContext<DiaryDateContextValue>({
  date: todayLocalDate(),
  setDate: () => {},
});

export function DiaryDateProvider({ children }: PropsWithChildren) {
  const [date, setDate] = useState(todayLocalDate);

  // Android keeps the app alive overnight; a new day starts on today.
  useEffect(() => {
    let day = todayLocalDate();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || todayLocalDate() === day) return;
      day = todayLocalDate();
      setDate(day);
    });
    return () => sub.remove();
  }, []);

  return (
    <DiaryDateContext.Provider value={{ date, setDate }}>{children}</DiaryDateContext.Provider>
  );
}

export function useDiaryDate() {
  return useContext(DiaryDateContext);
}
