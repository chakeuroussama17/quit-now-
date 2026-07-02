import type { ProductType, QuitReason, RelapseCause, UsageMoment } from '@/types/models';

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const PRODUCT_OPTIONS: Option<ProductType>[] = [
  { value: 'cigarette', label: 'Cigarettes' },
  { value: 'vape', label: 'Vape' },
  { value: 'rolled', label: 'Rolled tobacco' },
  { value: 'shisha', label: 'Shisha' },
];

export const QUIT_REASON_OPTIONS: Option<QuitReason>[] = [
  { value: 'health', label: 'My health' },
  { value: 'family', label: 'My family' },
  { value: 'kids', label: 'My kids' },
  { value: 'money', label: 'Money' },
  { value: 'fitness', label: 'Fitness & breathing' },
  { value: 'pregnancy', label: 'Pregnancy' },
  { value: 'smell_appearance', label: 'Smell & appearance' },
  { value: 'doctor', label: "Doctor's advice" },
  { value: 'self_control', label: 'Self-control & freedom' },
  { value: 'religious', label: 'Religious reasons' },
  { value: 'other', label: 'Other' },
];

export const USAGE_MOMENT_OPTIONS: Option<UsageMoment>[] = [
  { value: 'morning_coffee', label: 'Morning coffee' },
  { value: 'after_meals', label: 'After meals' },
  { value: 'work_breaks', label: 'Work breaks' },
  { value: 'stress', label: 'Stress' },
  { value: 'driving', label: 'Driving' },
  { value: 'social', label: 'Social settings' },
  { value: 'drinking', label: 'Drinking' },
  { value: 'boredom', label: 'Boredom' },
  { value: 'before_sleep', label: 'Before sleep' },
];

export const RELAPSE_CAUSE_OPTIONS: Option<RelapseCause>[] = [
  { value: 'stress', label: 'Stress' },
  { value: 'social_pressure', label: 'Social pressure' },
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'big_life_event', label: 'A big life event' },
  { value: 'boredom', label: 'Boredom' },
  { value: 'just_one_moment', label: '“Just one” moment' },
  { value: 'weight_gain', label: 'Weight gain' },
  { value: 'other', label: 'Other' },
];

export const QUIT_DATE_CHOICES = [
  { offsetDays: 0, label: 'Today' },
  { offsetDays: 1, label: 'Tomorrow' },
  { offsetDays: 3, label: 'In 3 days' },
  { offsetDays: 7, label: 'In a week' },
] as const;
