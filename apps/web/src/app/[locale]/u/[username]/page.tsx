import Profile from "./profile";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <Profile username={username} />;
}
