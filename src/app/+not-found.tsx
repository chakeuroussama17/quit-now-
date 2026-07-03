import { Redirect } from 'expo-router';

/** Any unknown deep link lands on the right screen instead of a dead end. */
export default function NotFoundScreen() {
  return <Redirect href="/" />;
}
