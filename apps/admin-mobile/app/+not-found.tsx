import { Redirect } from 'expo-router';
/** Any unknown path (e.g. when hosted under a sub-path) goes back to the start. */
export default function NotFound() { return <Redirect href="/" />; }
