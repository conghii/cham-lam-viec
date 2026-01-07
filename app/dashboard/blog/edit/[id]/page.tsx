"use client"

import { useLanguage } from "@/components/shared/language-context"
import { useEffect, useState, use, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Loader2, ImagePlus, X, Save } from "lucide-react"
import { updateBlogPost, getUserOrganization, getOrganizationMembers, OrganizationMember } from "@/lib/firebase/firestore"
import { uploadFile } from "@/lib/firebase/storage"
import { auth } from "@/lib/firebase/auth"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"
import { UserGroupSelect } from "@/components/dashboard/user-group-select"
import { BlogEditor } from "@/components/dashboard/blog-editor"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/firestore"
import { cn } from "@/lib/utils"

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use()
    const { id } = use(params)

    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [coverImage, setCoverImage] = useState<string | null>(null)
    const [assigneeIds, setAssigneeIds] = useState<string[]>([])
    const [groupIds, setGroupIds] = useState<string[]>([])

    // UI States
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Org Data
    const [orgId, setOrgId] = useState<string | null>(null)
    const [members, setMembers] = useState<OrganizationMember[]>([])

    const router = useRouter()
    const { t } = useLanguage()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Fetch Post Data
    useEffect(() => {
        const fetchPost = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "posts", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setTitle(data.title || "");
                    setContent(data.content || "");
                    setCoverImage(data.coverImage || null);
                    setAssigneeIds(data.assigneeIds || []);
                    setGroupIds(data.groupIds || []);
                } else {
                    toast.error("Post not found");
                    router.push("/dashboard/blog");
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

    // Fetch Org Data
    useEffect(() => {
        const loadOrg = async () => {
            const user = auth.currentUser;
            if (user) {
                const org = await getUserOrganization(user.uid);
                if (org) {
                    setOrgId(org.id);
                    const mems = await getOrganizationMembers(org.id);
                    setMembers(mems);
                }
            }
        }
        loadOrg();
    }, [])


    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Optimistic Preview
        const objectUrl = URL.createObjectURL(file)
        setCoverImage(objectUrl)
        setUploading(true)

        try {
            // Upload to "blog_covers/{timestamp}_{filename}"
            const path = `blog_covers/${Date.now()}_${file.name}`
            const url = await uploadFile(file, path)
            setCoverImage(url)
        } catch (error) {
            console.error("Failed to upload image", error)
            setCoverImage(null) // Revert on failure
            toast.error("Failed to upload image")
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) return

        setIsSubmitting(true)
        try {
            // Strip HTML tags for excerpt update (optional, but good practice)
            const strippedContent = content.replace(/<[^>]*>/g, '')
            const excerpt = strippedContent.substring(0, 150) + "..."

            await updateBlogPost(id, {
                title,
                content,
                excerpt,
                coverImage: coverImage || undefined,
                assigneeIds,
                groupIds,
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
        <div className="min-h-screen bg-background pb-20">
            {/* Minimal Header */}
            <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/blog">
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <span className="text-sm text-muted-foreground font-medium hidden md:inline-block">{t("edit_entry") || "Edit Entry"}</span>
                        {orgId && (
                            <div className="hidden md:block">
                                <UserGroupSelect
                                    orgId={orgId}
                                    assigneeIds={assigneeIds}
                                    groupIds={groupIds}
                                    onAssigneeChange={setAssigneeIds}
                                    onGroupChange={setGroupIds}
                                />
                            </div>
                        )}
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title || !content}
                        className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6"
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save_changes") || "Update"}
                    </Button>
                </div>
            </header>

            {/* Mobile Org Select */}
            {orgId && (
                <div className="md:hidden px-6 py-2 border-b bg-muted/20">
                    <UserGroupSelect
                        orgId={orgId}
                        assigneeIds={assigneeIds}
                        groupIds={groupIds}
                        onAssigneeChange={setAssigneeIds}
                        onGroupChange={setGroupIds}
                    />
                </div>
            )}

            <main className="max-w-4xl mx-auto px-6 pt-10">
                {/* Cover Image */}
                <div className="mb-8 group relative">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                    />

                    {coverImage ? (
                        <div className="relative w-full h-[300px] rounded-3xl overflow-hidden shadow-sm border bg-muted">
                            <Image
                                src={coverImage}
                                alt="Cover"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <Button variant="secondary" size="sm" onClick={() => setCoverImage(null)} className="mr-2">
                                    <X className="h-4 w-4 mr-2" /> Remove
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                                    Change Cover
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-muted"
                        >
                            <ImagePlus className="h-4 w-4" />
                            {uploading ? "Uploading..." : "Add Cover Image"}
                        </button>
                    )}
                </div>

                {/* Title Input */}
                <div className="mb-6">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Article Title..."
                        className="text-4xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50 bg-transparent"
                    />
                </div>

                {/* Editor */}
                <BlogEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Tell your story..."
                />
            </main>
        </div>
    )
}
