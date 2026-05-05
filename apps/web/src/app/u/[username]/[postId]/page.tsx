import PostDetail from "./post-detail";

export default async function PostPage({ params }: { params: Promise<{ postId: string; username: string }> }) {
  const { postId, username } = await params;
  return <PostDetail postId={postId} username={username} />;
}
