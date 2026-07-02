import type { Emotion, LocationTag, TriggerType } from '@/types/models';

import type { Option } from '../onboarding/options';

export const TRIGGER_OPTIONS: Option<TriggerType>[] = [
  { value: 'stress', label: 'Stress' },
  { value: 'habit', label: 'Habit' },
  { value: 'social', label: 'Social pressure' },
  { value: 'after_meal', label: 'After meal' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'boredom', label: 'Boredom' },
  { value: 'anxiety', label: 'Anxiety' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'other', label: 'Other' },
];

export const EMOTION_OPTIONS: Option<Emotion>[] = [
  { value: 'stressed', label: 'Stressed' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'bored', label: 'Bored' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'guilty', label: 'Guilty' },
  { value: 'ashamed', label: 'Ashamed' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'happy', label: 'Happy' },
  { value: 'angry', label: 'Angry' },
  { value: 'tired', label: 'Tired' },
];

export const LOCATION_OPTIONS: Option<LocationTag>[] = [
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'car', label: 'Car' },
  { value: 'social', label: 'Out with people' },
  { value: 'other', label: 'Other' },
];

export const PRODUCT_LABELS: Record<string, string> = {
  cigarette: 'Cigarette',
  vape: 'Vape',
  rolled: 'Rolled',
  shisha: 'Shisha',
};
