"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getBlogPost, type BlogPost, getOrganizationMembers, getUserOrganization, OrganizationMember, subscribeToGroups, Group } from "@/lib/firebase/firestore"
import { auth } from "@/lib/firebase/auth"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit2, Calendar, User, Clock } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { AssigneeDisplay } from "@/components/dashboard/assignee-display"

export default function BlogViewPage() {
    const params = useParams()
    const router = useRouter()
    const [post, setPost] = useState<BlogPost | null>(null)
    const [loading, setLoading] = useState(true)
    const [members, setMembers] = useState<OrganizationMember[]>([])
    const [groups, setGroups] = useState<Group[]>([])
    const [userRole, setUserRole] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        const loadPost = async () => {
            if (params.id) {
                try {
                    const data = await getBlogPost(params.id as string)
                    if (data && isMounted) {
                        setPost(data)
                    }
                } catch (error) {
                    console.error("Error loading post:", error)
                } finally {
                    if (isMounted) setLoading(false)
                }
            }
        }

        const loadOrgData = async (userId: string) => {
            try {
                const org = await getUserOrganization(userId)
                if (org && isMounted) {
                    const mems = await getOrganizationMembers(org.id)
                    if (isMounted) {
                        setMembers(mems)
                        const me = mems.find(m => m.id === userId)
                        if (me) setUserRole(me.role)
                    }
                }
            } catch (error) {
                console.error("Error loading org data:", error)
            }
        }

        const unsubAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                loadOrgData(user.uid)
            }
        })

        const unsubGroups = subscribeToGroups((data) => {
            if (isMounted) setGroups(data)
        })

        loadPost()

        return () => {
            isMounted = false
            unsubAuth()
            unsubGroups()
        }
    }, [params.id])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground animate-pulse">Loading story...</p>
            </div>
        )
    }

    if (!post) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <h2 className="text-2xl font-bold italic">Story not found.</h2>
                <Link href="/dashboard/blog">
                    <Button variant="outline" className="rounded-full">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Knowledge Base
                    </Button>
                </Link>
            </div>
        )
    }

    const canEdit = userRole === 'owner' || userRole === 'member';
    const author = members.find(m => m.id === post.userId);

    return (
        <div className="min-h-screen bg-background">
            {/* Minimal Header */}
            <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/dashboard/blog">
                        <Button variant="ghost" size="sm" className="rounded-full gap-2">
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                    </Link>
                    {canEdit && (
                        <Link href={`/dashboard/blog/${post.id}`}>
                            <Button variant="outline" size="sm" className="rounded-full gap-2">
                                <Edit2 className="h-3.5 w-3.5" /> Edit post
                            </Button>
                        </Link>
                    )}
                </div>
            </header>

            <article className="max-w-3xl mx-auto px-6 py-12">
                {post.coverImage && (
                    <div className="relative aspect-[21/9] w-full rounded-3xl overflow-hidden mb-12 shadow-xl border border-border/50">
                        <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                <header className="space-y-6 mb-12">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                        {post.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-4 border-t">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/20">
                                {author?.photoURL ? (
                                    <img src={author.photoURL} className="h-full w-full object-cover" />
                                ) : (
                                    author?.displayName?.[0] || 'A'
                                )}
                            </div>
                            <span className="font-medium text-foreground">{author?.displayName || 'Anonymous'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(post.createdAt.toMillis()), 'MMMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {Math.ceil(post.content.split(' ').length / 200)} min read
                        </div>
                    </div>

                    <div className="pt-2">
                        <AssigneeDisplay
                            assigneeIds={post.assigneeIds}
                            groupIds={post.groupIds}
                            members={members}
                            groups={groups}
                        />
                    </div>
                </header>

                <div
                    className="blog-content prose prose-lg dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />

                <footer className="mt-20 pt-8 border-t">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">End of story</p>
                            <p className="text-sm italic">Thanks for reading this entry in the Knowledge Base.</p>
                        </div>
                        <Link href="/dashboard/blog">
                            <Button variant="ghost" className="rounded-full">
                                Explore more →
                            </Button>
                        </Link>
                    </div>
                </footer>
            </article>

            <style jsx global>{`
                .blog-content h1 { font-size: 2.25rem; font-weight: 800; margin-top: 2.5rem; margin-bottom: 1.5rem; line-height: 1.2; }
                .blog-content h2 { font-size: 1.875rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1.25rem; line-height: 1.3; }
                .blog-content h3 { font-size: 1.5rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 1rem; line-height: 1.4; }
                .blog-content p { margin-top: 1.25rem; margin-bottom: 1.25rem; line-height: 1.8; font-size: 1.125rem; color: hsl(var(--foreground)/0.9); }
                .blog-content blockquote { 
                    border-left: 4px solid hsl(var(--primary)); 
                    padding: 1.5rem 2rem;
                    font-style: italic; 
                    color: hsl(var(--muted-foreground)); 
                    margin: 2.5rem 0; 
                    background: hsl(var(--accent)/0.1);
                    border-radius: 0 1rem 1rem 0;
                    font-size: 1.25rem;
                }
                .blog-content ul { list-style-type: disc; padding-left: 1.5rem; margin: 1.5rem 0; }
                .blog-content ol { list-style-type: decimal; padding-left: 1.5rem; margin: 1.5rem 0; }
                .blog-content li { margin: 0.75rem 0; line-height: 1.7; }
                .blog-content mark { background-color: #fef08a; padding: 0.1em 0.3em; border-radius: 0.3em; color: black; }
                .blog-content a { color: hsl(var(--primary)); text-decoration: underline; font-weight: 500; }
                .blog-content img { border-radius: 1.5rem; max-width: 100%; height: auto; margin: 3rem 0; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1); }
                .blog-content code { 
                    background: hsl(var(--accent)); 
                    padding: 0.2rem 0.5rem; 
                    border-radius: 0.4rem; 
                    font-family: monospace; 
                    font-size: 0.9em; 
                }
                .blog-content pre {
                    background: #1e293b;
                    color: #f8fafc;
                    padding: 2rem;
                    border-radius: 1rem;
                    margin: 2.5rem 0;
                    overflow-x: auto;
                    font-size: 0.95rem;
                }
                .blog-content [style*="text-align: center"] { text-align: center; }
                .blog-content [style*="text-align: right"] { text-align: right; }
                .blog-content [style*="text-align: justify"] { text-align: justify; }
            `}</style>
        </div>
    )
}
