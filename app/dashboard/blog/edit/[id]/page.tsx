"use client"

import { useLanguage } from "@/components/shared/language-context"
import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea" // Fallback if no rich editor
import { ArrowLeft, Save, Image as ImageIcon, Loader2 } from "lucide-react"
import { addBlogPost, updateBlogPost, getBlogPost, getUserOrganization } from "@/lib/firebase/firestore" // Need getBlogPost
import { auth } from "@/lib/firebase/auth"
import { toast } from "sonner"
import Link from "next/link"
import { AssigneeDisplay } from "@/components/dashboard/assignee-display"
import { UserGroupSelect } from "@/components/dashboard/user-group-select"
import { Label } from "@/components/ui/label"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/firestore"

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use()
    const { id } = use(params)

    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [tagInput, setTagInput] = useState("")
    const [tags, setTags] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [assigneeIds, setAssigneeIds] = useState<string[]>([])
    const [groupIds, setGroupIds] = useState<string[]>([])
    const [orgId, setOrgId] = useState<string>("")
    const router = useRouter()
    const { t } = useLanguage()

    useEffect(() => {
        const fetchPost = async () => {
            if (!id) return;
            try {
                // Direct fetch since getBlogPost might not be exported or working as expected
                const docRef = doc(db, "posts", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setTitle(data.title);
                    setContent(data.content);
                    setTags(data.tags || []);
                    setAssigneeIds(data.assigneeIds || []);
                    setGroupIds(data.groupIds || []);
                } else {
                    toast.error("Post not found");
                    router.push("/dashboard/blog");
                }

                // Fetch Org ID
                const user = auth.currentUser;
                if (user) {
                    const org = await getUserOrganization(user.uid);
                    if (org) setOrgId(org.id);
                }
            } catch (error) {
                console.error("Error fetching post:", error);
                toast.error("Failed to load post");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPost();
    }, [id, router]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !content.trim()) return

        setIsSubmitting(true)
        try {
            await updateBlogPost(id, {
                title,
                content,
                tags,
                assigneeIds,
                groupIds,
                // excerpt: content.slice(0, 150) + "..." // Optional update
            })
            toast.success("Blog post updated successfully!")
            router.push("/dashboard/blog")
        } catch (error) {
            console.error("Failed to update post:", error)
            toast.error("Failed to update post")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <Link href="/dashboard/blog" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("back_to_blog")}
            </Link>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
                <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">{t("edit_entry") || "Edit Entry"}</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                            placeholder={t("entry_title_placeholder")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-lg font-medium h-12"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Content (Markdown supported)</Label>
                        <Textarea
                            placeholder={t("entry_content_placeholder")}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-[300px] font-mono text-sm leading-relaxed"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Tags</Label>
                            <div className="flex flex-wrap gap-2 mb-2 p-2 border rounded-md min-h-[42px]">
                                {tags.map(tag => (
                                    <span key={tag} className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                        #{tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><span className="sr-only">Remove</span>&times;</button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type tag & Enter..."
                                    className="flex-1 bg-transparent outline-none text-sm min-w-[80px]"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Assignee / Group</Label>
                            <UserGroupSelect
                                orgId={orgId}
                                assigneeIds={assigneeIds}
                                groupIds={groupIds}
                                onAssigneeChange={setAssigneeIds}
                                onGroupChange={setGroupIds}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Link href="/dashboard/blog">
                            <Button type="button" variant="outline">{t("cancel")}</Button>
                        </Link>
                        <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t("saving")}
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {t("save_changes") || "Update"}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
