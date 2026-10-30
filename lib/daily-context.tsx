import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "@tetap-hari-ini/private-v1";

export type ChecklistId = "sales" | "transition" | "afternoon" | "safeApps" | "family" | "journal";

export type DayRecord = {
  tasks: Record<ChecklistId, boolean>;
  journal: string;
  urgeCount: number;
  urgeSteps: string[];
};

export type DailyData = {
  startDate: string;
  familyPhotoUri: string | null;
  gamblingAppsBlocked: boolean;
  remindersEnabled: boolean;
  records: Record<string, DayRecord>;
};

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function tomorrowKey() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return localDateKey(tomorrow);
}

export function emptyDayRecord(): DayRecord {
  return {
    tasks: { sales: false, transition: false, afternoon: false, safeApps: false, family: false, journal: false },
    journal: "",
    urgeCount: 0,
    urgeSteps: [],
  };
}

function initialData(): DailyData {
  return { startDate: tomorrowKey(), familyPhotoUri: null, gamblingAppsBlocked: false, remindersEnabled: false, records: {} };
}

type DailyContextValue = {
  data: DailyData;
  ready: boolean;
  today: DayRecord;
  todayKey: string;
  toggleTask: (id: ChecklistId) => void;
  saveJournal: (text: string) => void;
  setFamilyPhoto: (uri: string | null) => void;
  setGamblingAppsBlocked: (value: boolean) => void;
  setRemindersEnabled: (value: boolean) => void;
  logUrge: () => void;
  markUrgeStep: (step: string) => void;
};

const DailyContext = createContext<DailyContextValue | null>(null);

export function DailyProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DailyData>(initialData);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        if (raw) {
          const saved = JSON.parse(raw) as Partial<DailyData>;
          const fallback = initialData();
          setData({ ...fallback, ...saved, records: saved.records ?? {} });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => undefined);
  }, [data, ready]);

  const update = useCallback((change: (current: DailyData) => DailyData) => {
    setData((current) => change(current));
  }, []);

  const todayKey = localDateKey();
  const today = data.records[todayKey] ?? emptyDayRecord();

  const value = useMemo<DailyContextValue>(() => ({
    data,
    ready,
    today,
    todayKey,
    toggleTask: (id) => update((current) => {
      const key = localDateKey();
      const record = current.records[key] ?? emptyDayRecord();
      return { ...current, records: { ...current.records, [key]: { ...record, tasks: { ...record.tasks, [id]: !record.tasks[id] } } } };
    }),
    saveJournal: (text) => update((current) => {
      const key = localDateKey();
      const record = current.records[key] ?? emptyDayRecord();
      return { ...current, records: { ...current.records, [key]: { ...record, journal: text, tasks: { ...record.tasks, journal: text.trim().length > 0 } } } };
    }),
    setFamilyPhoto: (uri) => update((current) => ({ ...current, familyPhotoUri: uri })),
    setGamblingAppsBlocked: (value) => update((current) => ({ ...current, gamblingAppsBlocked: value })),
    setRemindersEnabled: (value) => update((current) => ({ ...current, remindersEnabled: value })),
    logUrge: () => update((current) => {
      const key = localDateKey();
      const record = current.records[key] ?? emptyDayRecord();
      return { ...current, records: { ...current.records, [key]: { ...record, urgeCount: record.urgeCount + 1 } } };
    }),
    markUrgeStep: (step) => update((current) => {
      const key = localDateKey();
      const record = current.records[key] ?? emptyDayRecord();
      const steps = record.urgeSteps.includes(step) ? record.urgeSteps.filter((item) => item !== step) : [...record.urgeSteps, step];
      return { ...current, records: { ...current.records, [key]: { ...record, urgeSteps: steps } } };
    }),
  }), [data, ready, today, todayKey, update]);

  return <DailyContext.Provider value={value}>{children}</DailyContext.Provider>;
}

export function useDaily() {
  const value = useContext(DailyContext);
  if (!value) throw new Error("useDaily must be used inside DailyProvider");
  return value;
}

export function dateKey(date: Date) {
  return localDateKey(date);
}
