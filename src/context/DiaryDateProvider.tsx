import { createContext, useContext, useState, type PropsWithChildren } from 'react';

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

  return (
    <DiaryDateContext.Provider value={{ date, setDate }}>{children}</DiaryDateContext.Provider>
  );
}

export function useDiaryDate() {
  return useContext(DiaryDateContext);
}
