"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase/auth";
import { Comment, deleteGoalComment, updateGoalComment } from "@/lib/firebase/firestore";

interface GoalCommentItemProps {
    comment: Comment;
    goalId: string;
}

export function GoalCommentItem({ comment, goalId }: GoalCommentItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(comment.content);
    const currentUser = auth.currentUser;
    const isOwner = currentUser?.uid === comment.userId;

    const handleUpdate = async () => {
        if (!content.trim()) return;
        try {
            await updateGoalComment(goalId, comment.id, content);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update comment", error);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteGoalComment(goalId, comment.id);
        } catch (error) {
            console.error("Failed to delete comment", error);
        }
    };

    return (
        <div className="flex gap-3 text-sm group/comment">
            <Avatar className="h-8 w-8">
                <AvatarImage src={comment.userPhotoURL} />
                <AvatarFallback>{comment.userDisplayName?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
                <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-xs">{comment.userDisplayName}</span>
                    <span className="text-[10px] text-muted-foreground">
                        {comment.createdAt ? format(comment.createdAt.toDate(), "MMM d, h:mm a") : "Just now"}
                    </span>
                </div>

                {isEditing ? (
                    <div className="space-y-2">
                        <Input
                            value={content}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContent(e.target.value)}
                            className="h-8 text-xs"
                            autoFocus
                        />
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleUpdate} className="h-6 text-xs px-2">Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-6 text-xs px-2">Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <div className="group relative">
                        <p className="text-muted-foreground leading-snug text-xs bg-muted/40 p-2 rounded-lg pr-8">
                            {comment.content}
                        </p>
                        {isOwner && (
                            <div className="absolute top-1 right-1 opacity-100 md:opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-background/80">
                                            <MoreVertical className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                            <Edit2 className="h-3 w-3 mr-2" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                                            <Trash2 className="h-3 w-3 mr-2" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
