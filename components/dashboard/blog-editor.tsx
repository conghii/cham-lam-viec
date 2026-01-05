"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { useState } from 'react'
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Highlighter,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Heading1,
    Heading2,
    Heading3,
    Quote,
    List,
    ListOrdered,
    Link as LinkIcon,
    Image as ImageIcon,
    Code,
    Undo,
    Redo,
} from "lucide-react"

interface BlogEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

export function BlogEditor({ content, onChange, placeholder }: BlogEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: placeholder || 'Tell your story...',
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Highlight,
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline cursor-pointer',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-xl max-w-full h-auto my-6',
                },
            }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'prose prose-lg dark:prose-invert max-w-none min-h-[500px] outline-none py-4',
            },
        },
    })

    const [isLinkOpen, setIsLinkOpen] = useState(false)
    const [linkUrl, setLinkUrl] = useState('')
    const [isImageOpen, setIsImageOpen] = useState(false)
    const [imageUrl, setImageUrl] = useState('')

    if (!editor) {
        return null
    }

    const addImage = () => {
        if (imageUrl) {
            editor.chain().focus().setImage({ src: imageUrl }).run()
            setImageUrl('')
            setIsImageOpen(false)
        }
    }

    const handleSetLink = () => {
        if (linkUrl === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
        }
        setLinkUrl('')
        setIsLinkOpen(false)
    }

    const openLinkModal = () => {
        const previousUrl = editor.getAttributes('link').href
        setLinkUrl(previousUrl || '')
        setIsLinkOpen(true)
    }

    const openImageModal = () => {
        setIsImageOpen(true)
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-wrap items-center gap-1 p-1.5 border rounded-xl bg-background/50 backdrop-blur-sm sticky top-20 z-10 shadow-sm border-border/40">
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={editor.isActive('heading', { level: 1 }) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={editor.isActive('heading', { level: 2 }) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={editor.isActive('heading', { level: 3 }) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <Heading3 className="h-4 w-4" />
                </Button>

                <Separator orientation="vertical" className="mx-1 h-6 bg-border/40" />

                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={editor.isActive('underline') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <UnderlineIcon className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={editor.isActive('strike') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <Strikethrough className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    className={editor.isActive('highlight') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <Highlighter className="h-4 w-4" />
                </Button>

                <Separator orientation="vertical" className="mx-1 h-6 bg-border/40" />

                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={editor.isActive({ textAlign: 'left' }) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={editor.isActive({ textAlign: 'center' }) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={editor.isActive({ textAlign: 'right' }) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <AlignRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    className={editor.isActive({ textAlign: 'justify' }) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <AlignJustify className="h-4 w-4" />
                </Button>

                <Separator orientation="vertical" className="mx-1 h-6 bg-border/40" />

                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive('bulletList') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive('orderedList') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={editor.isActive('blockquote') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <Quote className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    className={editor.isActive('code') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <Code className="h-4 w-4" />
                </Button>

                <Separator orientation="vertical" className="mx-1 h-6 bg-border/40" />

                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={openLinkModal}
                    className={editor.isActive('link') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
                >
                    <LinkIcon className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={openImageModal}
                    className="text-muted-foreground"
                >
                    <ImageIcon className="h-4 w-4" />
                </Button>

                <div className="flex-1" />

                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="text-muted-foreground"
                >
                    <Undo className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="text-muted-foreground"
                >
                    <Redo className="h-4 w-4" />
                </Button>
            </div>

            <div className="max-w-none">
                <EditorContent
                    editor={editor}
                />
            </div>

            <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Insert Link</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="url">URL</Label>
                            <Input
                                id="url"
                                placeholder="https://example.com"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLinkOpen(false)}>Cancel</Button>
                        <Button onClick={handleSetLink}>Set Link</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Insert Image</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="img-url">Image URL</Label>
                            <Input
                                id="img-url"
                                placeholder="https://example.com/image.jpg"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsImageOpen(false)}>Cancel</Button>
                        <Button onClick={addImage}>Insert Image</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                .ProseMirror {
                    min-height: 500px;
                    outline: none;
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #94a3b8;
                    pointer-events: none;
                    height: 0;
                }
                .ProseMirror h1 { font-size: 2.25rem; font-weight: 800; margin-top: 2rem; margin-bottom: 1.5rem; line-height: 1.2; }
                .ProseMirror h2 { font-size: 1.875rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 1.25rem; line-height: 1.3; }
                .ProseMirror h3 { font-size: 1.5rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 1rem; line-height: 1.4; }
                .ProseMirror p { margin-top: 1rem; margin-bottom: 1rem; line-height: 1.7; font-size: 1.125rem; }
                .ProseMirror blockquote { 
                    border-left: 4px solid hsl(var(--primary)); 
                    padding-left: 1.5rem; 
                    font-style: italic; 
                    color: hsl(var(--muted-foreground)); 
                    margin: 2rem 0; 
                    background: hsl(var(--accent)/0.1);
                    padding-top: 1rem;
                    padding-bottom: 1rem;
                    border-radius: 0 0.5rem 0.5rem 0;
                }
                .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin: 1.5rem 0; }
                .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin: 1.5rem 0; }
                .ProseMirror li { margin: 0.5rem 0; }
                .ProseMirror mark { background-color: #fef08a; padding: 0.1em 0.2em; border-radius: 0.2em; color: black; }
                .ProseMirror a { color: hsl(var(--primary)); text-decoration: underline; font-weight: 500; }
                .ProseMirror img { border-radius: 1rem; max-width: 100%; height: auto; margin: 2rem 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .ProseMirror code { 
                    background: hsl(var(--accent)); 
                    padding: 0.2rem 0.4rem; 
                    border-radius: 0.3rem; 
                    font-family: monospace; 
                    font-size: 0.9em; 
                }
                .ProseMirror pre {
                    background: #1e293b;
                    color: #f8fafc;
                    padding: 1.5rem;
                    border-radius: 0.75rem;
                    margin: 1.5rem 0;
                    overflow-x: auto;
                }
            `}</style>
        </div>
    )
}
