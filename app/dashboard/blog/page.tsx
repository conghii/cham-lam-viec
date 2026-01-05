"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Pencil, Shield } from "lucide-react"
import { subscribeToBlogPosts, deleteBlogPost, type BlogPost, subscribeToGroups, Group, getOrganizationMembers, getUserOrganization, OrganizationMember } from "@/lib/firebase/firestore"
import { auth } from "@/lib/firebase/auth"
import { AssigneeDisplay } from "@/components/dashboard/assignee-display"
import { toast } from "sonner"

export default function BlogListPage() {
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [groups, setGroups] = useState<Group[]>([])
    const [currentUser, setCurrentUser] = useState(auth.currentUser)
    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState<'owner' | 'member' | 'viewer' | 'restricted' | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([])

    useEffect(() => {
        const fetchUserRole = async (userId: string) => {
            const org = await getUserOrganization(userId);
            if (org) {
                const mems = await getOrganizationMembers(org.id);
                setMembers(mems);
                const member = mems.find(m => m.id === userId);
                if (member) setUserRole(member.role);
            }
        }

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            setCurrentUser(user)
            if (user) {
                fetchUserRole(user.uid);
            }
        })

        const unsubscribePosts = subscribeToBlogPosts((data) => {
            setPosts(data)
            setLoading(false)
        })

        const unsubscribeGroups = subscribeToGroups((data) => {
            setGroups(data)
        })

        return () => {
            unsubscribeAuth()
            unsubscribePosts()
            unsubscribeGroups()
        }
    }, [])

    // Filter Logic
    const filteredPosts = posts.filter(post => {
        if (!currentUser) return false

        // 1. Author
        if (post.userId === currentUser.uid) return true

        // 2. Assigned
        if (post.assigneeIds?.includes(currentUser.uid)) return true

        // 3. Group Assigned (User is member of group)
        const userGroupIds = groups.filter(g => g.memberIds.includes(currentUser.uid)).map(g => g.id)
        if (post.groupIds?.some(gid => userGroupIds.includes(gid))) return true

        // 4. Unassigned/Public (Policy: If no explicit assignments, visible to all in Org)
        const hasAssignments = (post.assigneeIds && post.assigneeIds.length > 0) || (post.groupIds && post.groupIds.length > 0)
        if (!hasAssignments) return true

        return false
    })

    const formatDate = (timestamp: any) => {
        if (!timestamp) return ""
        return new Date(timestamp.toMillis()).toLocaleDateString()
    }

    if (userRole === 'restricted') {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <div className="bg-destructive/10 p-4 rounded-full w-fit mx-auto">
                        <Shield className="h-10 w-10 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-bold">Access Restricted</h2>
                    <p className="text-muted-foreground">You do not have permission to view blog entries. Please contact your organization owner.</p>
                </div>
            </div>
        );
    }

    const canEdit = userRole === 'owner' || userRole === 'member';

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Knowledge Base</h2>
                    <p className="text-muted-foreground">Document your journey, learnings, and reflections.</p>
                </div>
                {canEdit && (
                    <Link href="/dashboard/blog/new">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            New Entry
                        </Button>
                    </Link>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full text-center py-10 text-muted-foreground">Loading entries...</div>
                ) : filteredPosts.length === 0 ? (
                    <div className="col-span-full text-center py-20 border rounded-lg bg-muted/20 border-dashed">
                        <div className="text-muted-foreground">No entries visible to you.</div>
                    </div>
                ) : (
                    filteredPosts.map((post) => (
                        <Card key={post.id} className="group relative flex flex-col justify-between hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <div className="text-xs text-muted-foreground mb-2 flex justify-between items-center">
                                    {formatDate(post.createdAt)}
                                </div>
                                <Link href={`/dashboard/blog/view/${post.id}`}>
                                    <CardTitle className="text-xl line-clamp-2 hover:text-primary transition-colors cursor-pointer capitalize">
                                        {post.title}
                                    </CardTitle>
                                </Link>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground line-clamp-3 mb-4">
                                    {post.excerpt || post.content.replace(/<[^>]*>/g, '').substring(0, 100) + "..."}
                                </p>
                                {canEdit && (
                                    <div className="flex justify-between items-center w-full">
                                        <AssigneeDisplay
                                            assigneeIds={post.assigneeIds}
                                            groupIds={post.groupIds}
                                            members={members}
                                            groups={groups}
                                        />
                                        <div className="flex gap-2">
                                            <Link href={`/dashboard/blog/${post.id}`}>
                                                <Button variant="secondary" size="sm" className="h-8">
                                                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    deleteBlogPost(post.id)
                                                    toast.success("Entry deleted")
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
