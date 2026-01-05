"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { addBlogPost, OrganizationMember, getOrganizationMembers, getUserOrganization } from "@/lib/firebase/firestore"
import { uploadFile } from "@/lib/firebase/storage"
import { auth } from "@/lib/firebase/auth"
import { UserGroupSelect } from "@/components/dashboard/user-group-select"
import { BlogEditor } from "@/components/dashboard/blog-editor"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2, ImagePlus, X, Save } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

export default function NewBlogPostPage() {
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [excerpt, setExcerpt] = useState("")
    const [coverImage, setCoverImage] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Org & Assignees
    const [orgId, setOrgId] = useState<string | null>(null)
    const [members, setMembers] = useState<OrganizationMember[]>([])
    const [assigneeIds, setAssigneeIds] = useState<string[]>([])
    const [groupIds, setGroupIds] = useState<string[]>([])

    // Load Org Data
    useState(() => {
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
    })

    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            // Upload to "blog_covers/{timestamp}_{filename}"
            const path = `blog_covers/${Date.now()}_${file.name}`
            const url = await uploadFile(file, path)
            setCoverImage(url)
        } catch (error) {
            console.error("Failed to upload image", error)
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) return
        setSaving(true)
        try {
            // Strip HTML tags for excerpt
            const strippedContent = content.replace(/<[^>]*>/g, '')
            const finalExcerpt = excerpt.trim() || strippedContent.substring(0, 150) + "..."

            await addBlogPost(title, finalExcerpt, content, coverImage || undefined, assigneeIds, groupIds)
            router.push("/dashboard/blog")
        } catch (error) {
            console.error("Failed to save post", error)
            setSaving(false)
        }
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
                        <span className="text-sm text-muted-foreground font-medium hidden md:inline-block">Drafting</span>
                        {orgId && (
                            <div className="ml-2">
                                <UserGroupSelect
                                    orgId={orgId}
                                    assigneeIds={assigneeIds}
                                    groupIds={groupIds}
                                    onAssigneeChange={setAssigneeIds}
                                    onGroupChange={setGroupIds}
                                    members={members}
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleSave}
                            disabled={saving || !title || !content}
                            className="rounded-full px-6 font-medium"
                        >
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Publish
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Cover Image */}
                <div className="group relative w-full mb-8">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                    />

                    {coverImage ? (
                        <div className="relative aspect-[2/1] w-full rounded-2xl overflow-hidden shadow-sm">
                            <img
                                src={coverImage}
                                alt="Cover"
                                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                            />
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 text-xs backdrop-blur-sm bg-background/50 hover:bg-background/80"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Change
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => setCoverImage(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex">
                            <Button
                                variant="ghost"
                                className="text-muted-foreground hover:text-foreground gap-2 pl-0"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                                {uploading ? "Uploading..." : "Add Cover Image"}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Title */}
                <Textarea
                    placeholder="Title"
                    className="w-full resize-none overflow-hidden bg-transparent text-4xl md:text-5xl font-extrabold placeholder:text-muted-foreground/40 border-none shadow-none focus-visible:ring-0 px-0 py-2 min-h-[60px] leading-tight"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    rows={1}
                />

                {/* Content */}
                <BlogEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Tell your story..."
                />
            </main>
        </div>
    )
}
