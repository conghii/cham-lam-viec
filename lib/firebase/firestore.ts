import { app } from "./config";
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    getDocs,
    getDoc,
    setDoc,
    writeBatch,
    arrayUnion,
    orderBy,
    limit,
    type Timestamp,
    type Unsubscribe,
    arrayRemove,
    deleteField,
    or,
    and,
    increment
} from "firebase/firestore";
import { auth } from "./auth";

export const db = getFirestore(app);

export type SubTask = {
    id: string;
    title: string;
    completed: boolean;
}

export type Task = {
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    userId: string;
    orgId: string | null;
    createdAt: Timestamp;
    tag?: string;
    dueDate?: string | null;
    priority?: 'low' | 'medium' | 'high';
    status?: string; // For custom columns
    subtasks?: SubTask[];
    goalId?: string | null;
    assigneeId?: string | null;
    assigneeIds?: string[];
    groupIds?: string[];
}

export type Comment = {
    id: string;
    taskId: string;
    userId: string;
    content: string;
    createdAt: Timestamp;
    userDisplayName?: string;
    userPhotoURL?: string;
}

export type TaskColumn = {
    id: string;
    title: string;
    order: number;
    userId: string;
    orgId?: string;
}

export type KeyResult = {
    id: string;
    title: string;
    current: number;
    target: number;
    unit: string;
}

export type Goal = {
    id: string;
    title: string;
    description?: string;
    progress: number;
    userId: string;
    createdAt: Timestamp;
    targetDate?: string;
    keyResults?: KeyResult[];
    assigneeIds?: string[];
    groupIds?: string[];
}

export type Strategy = {
    id: string;
    title: string;
    description: string;
    icon?: string;
}

export type MVS = {
    id: string;
    mission: string;
    vision: string;
    strategies: Strategy[];
    updatedAt: Timestamp;
    updatedBy: string;
}

// --- Tasks ---

export const addTask = async (title: string, tag: string = "general", dueDate?: string, priority: 'low' | 'medium' | 'high' = 'medium', assigneeId: string | null = null, assigneeIds: string[] = [], groupIds: string[] = []) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const orgId = userSnap.exists() ? userSnap.data().orgId : null;

    // Normalize assignees: if assigneeIds is provided, use it. If only assigneeId is provided, put it in array.
    let finalAssigneeIds = [...assigneeIds];
    if (assigneeId && !finalAssigneeIds.includes(assigneeId)) {
        finalAssigneeIds.push(assigneeId);
    }

    await addDoc(collection(db, "tasks"), {
        title,
        completed: false,
        userId: user.uid,
        orgId: orgId || null,
        tag,
        dueDate: dueDate || null,
        priority,
        status: "backlog",
        createdAt: serverTimestamp(),
        subtasks: [],
        assigneeId: assigneeId || null, // Keep for backward compat for now
        assigneeIds: finalAssigneeIds,
        groupIds
    });
};

export const toggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
        completed: !currentStatus
    });
};

export const deleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, "tasks", taskId));
};

export const updateTaskStatus = async (taskId: string, status: string) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, { status });
};

// Generic update task function
export const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, updates);
};

// --- Comments ---

export const addTaskComment = async (taskId: string, content: string) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    await addDoc(collection(db, `tasks/${taskId}/comments`), {
        taskId,
        userId: user.uid,
        content,
        createdAt: serverTimestamp(),
        userDisplayName: user.displayName || "Unknown",
        userPhotoURL: user.photoURL || ""
    });
};

export const subscribeToTaskComments = (taskId: string, callback: (comments: Comment[]) => void) => {
    const q = query(
        collection(db, `tasks/${taskId}/comments`),
        // orderBy("createdAt", "asc") // Requires index, using client side sort for now if small
    );

    return onSnapshot(q, (snapshot) => {
        const comments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Comment[];
        // Client-side sort to avoid composite index requirement for now
        comments.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
        callback(comments);
    });
};

export const deleteTaskComment = async (taskId: string, commentId: string) => {
    await deleteDoc(doc(db, `tasks/${taskId}/comments`, commentId));
};

export const updateTaskComment = async (taskId: string, commentId: string, content: string) => {
    await updateDoc(doc(db, `tasks/${taskId}/comments`, commentId), {
        content
    });
};


// --- Task Columns ---

export const subscribeToTaskColumns = (callback: (columns: TaskColumn[]) => void) => {
    const user = auth.currentUser;
    if (!user) return () => { };

    let unsubscribe: () => void;

    (async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const orgId = userSnap.exists() ? userSnap.data().orgId : null;

        const q = orgId
            ? query(collection(db, "task_columns"), where("orgId", "==", orgId))
            : query(collection(db, "task_columns"), where("userId", "==", user.uid));

        unsubscribe = onSnapshot(q, (snapshot) => {
            const columns = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as TaskColumn[];
            columns.sort((a, b) => a.order - b.order);
            callback(columns);
        });
    })();

    return () => {
        if (unsubscribe) unsubscribe();
    };
};

export const addTaskColumn = async (title: string, order: number) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const orgId = userSnap.exists() ? userSnap.data().orgId : null;

    await addDoc(collection(db, "task_columns"), {
        title,
        order,
        userId: user.uid,
        orgId: orgId || null,
        createdAt: serverTimestamp(),
    });
};

export const updateTaskColumn = async (columnId: string, data: Partial<TaskColumn>) => {
    const colRef = doc(db, "task_columns", columnId);
    await updateDoc(colRef, data);
};

export const deleteTaskColumn = async (columnId: string) => {
    await deleteDoc(doc(db, "task_columns", columnId));
};

export const batchUpdateColumnOrders = async (updates: { id: string; order: number }[]) => {
    const batch = writeBatch(db);
    updates.forEach(({ id, order }) => {
        const ref = doc(db, "task_columns", id);
        batch.update(ref, { order });
    });
    await batch.commit();
};



export const subscribeToGoalTasks = (goalId: string, callback: (tasks: Task[]) => void) => {
    const user = auth.currentUser;
    if (!user) return () => { };

    let unsubscribe: () => void;

    (async () => {
        const q = query(
            collection(db, "tasks"),
            where("goalId", "==", goalId),
            where("userId", "==", user.uid) // Ensure user owns the task
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
            const tasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Task[];
            // Sort by completion (open first) then date
            tasks.sort((a, b) => (Number(a.completed) - Number(b.completed)) || (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            callback(tasks);
        });
    })();

    return () => {
        if (unsubscribe) unsubscribe();
    };
};

// --- Goals ---

export const addGoal = async (title: string, targetDate: string, description: string = "", assigneeIds: string[] = [], groupIds: string[] = []) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const orgId = userSnap.exists() ? userSnap.data().orgId : null;

    await addDoc(collection(db, "goals"), {
        title,
        description,
        progress: 0,
        userId: user.uid,
        orgId: orgId || null,
        targetDate,
        keyResults: [],
        createdAt: serverTimestamp(),
        assigneeIds,
        groupIds
    });
};

export const addKeyResult = async (goalId: string, keyResult: Omit<KeyResult, "id">) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const goalRef = doc(db, "goals", goalId);
    const newKeyResult = { ...keyResult, id: Math.random().toString(36).substr(2, 9) };

    const { getDoc } = await import("firebase/firestore");
    const docSnap = await getDoc(goalRef);
    if (!docSnap.exists()) throw new Error("Goal not found");

    const goalData = docSnap.data() as Goal;
    const currentKeyResults = goalData.keyResults || [];
    const updatedKeyResults = [...currentKeyResults, newKeyResult];

    const totalProgress = updatedKeyResults.reduce((acc, kr) => acc + (Math.min(kr.current / kr.target, 1) * 100), 0);
    const newProgress = Math.round(totalProgress / updatedKeyResults.length);

    await updateDoc(goalRef, {
        keyResults: updatedKeyResults,
        progress: newProgress
    });
};

export const updateKeyResultProgress = async (goalId: string, keyResultId: string, newCurrent: number) => {
    const goalRef = doc(db, "goals", goalId);
    const { getDoc } = await import("firebase/firestore");
    const docSnap = await getDoc(goalRef);
    if (!docSnap.exists()) throw new Error("Goal not found");

    const goalData = docSnap.data() as Goal;
    const keyResults = goalData.keyResults || [];

    const updatedKeyResults = keyResults.map(kr =>
        kr.id === keyResultId ? { ...kr, current: newCurrent } : kr
    );

    const totalProgress = updatedKeyResults.reduce((acc, kr) => acc + (Math.min(kr.current / kr.target, 1) * 100), 0);
    const newProgress = Math.round(totalProgress / updatedKeyResults.length);

    await updateDoc(goalRef, {
        keyResults: updatedKeyResults,
        progress: newProgress
    });
};

export const updateGoalManualProgress = async (goalId: string, progress: number) => {
    const goalRef = doc(db, "goals", goalId);
    await updateDoc(goalRef, {
        progress
    });
};

export const updateGoalProgress = async (goalId: string, progress: number) => {
    const goalRef = doc(db, "goals", goalId);
    await updateDoc(goalRef, {
        progress
    });
};

export const updateGoal = async (goalId: string, data: Partial<Pick<Goal, "title" | "description" | "targetDate" | "assigneeIds" | "groupIds">>) => {
    const goalRef = doc(db, "goals", goalId);
    await updateDoc(goalRef, data);
};

export const updateKeyResult = async (goalId: string, keyResult: KeyResult) => {
    const goalRef = doc(db, "goals", goalId);
    const { getDoc } = await import("firebase/firestore");
    const docSnap = await getDoc(goalRef);
    if (!docSnap.exists()) throw new Error("Goal not found");

    const goalData = docSnap.data() as Goal;
    const keyResults = goalData.keyResults || [];

    const updatedKeyResults = keyResults.map(kr =>
        kr.id === keyResult.id ? keyResult : kr
    );

    const totalProgress = updatedKeyResults.reduce((acc, kr) => acc + (Math.min(kr.current / kr.target, 1) * 100), 0);
    const newProgress = updatedKeyResults.length > 0 ? Math.round(totalProgress / updatedKeyResults.length) : goalData.progress;

    await updateDoc(goalRef, {
        keyResults: updatedKeyResults,
        progress: newProgress
    });
};

export const deleteKeyResult = async (goalId: string, keyResultId: string) => {
    const goalRef = doc(db, "goals", goalId);
    const { getDoc } = await import("firebase/firestore");
    const docSnap = await getDoc(goalRef);
    if (!docSnap.exists()) throw new Error("Goal not found");

    const goalData = docSnap.data() as Goal;
    const keyResults = goalData.keyResults || [];

    const updatedKeyResults = keyResults.filter(kr => kr.id !== keyResultId);

    let newProgress = goalData.progress;
    if (updatedKeyResults.length > 0) {
        const totalProgress = updatedKeyResults.reduce((acc, kr) => acc + (Math.min(kr.current / kr.target, 1) * 100), 0);
        newProgress = Math.round(totalProgress / updatedKeyResults.length);
    }

    await updateDoc(goalRef, {
        keyResults: updatedKeyResults,
        progress: newProgress
    });
};

export const deleteGoal = async (goalId: string) => {
    await deleteDoc(doc(db, "goals", goalId));
};

export const subscribeToGoals = (callback: (goals: Goal[]) => void) => {
    const user = auth.currentUser;
    if (!user) return () => { };

    let unsubscribe: () => void;

    (async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const orgId = userSnap.exists() ? userSnap.data().orgId : null;

        const q = orgId
            ? query(collection(db, "goals"), where("orgId", "==", orgId))
            : query(collection(db, "goals"), where("userId", "==", user.uid));

        unsubscribe = onSnapshot(q, (snapshot) => {
            const goals = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Goal[];
            goals.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            callback(goals);
        });
    })();

    return () => {
        if (unsubscribe) unsubscribe();
    };
};

export const addGoalComment = async (goalId: string, content: string) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    await addDoc(collection(db, `goals/${goalId}/comments`), {
        goalId,
        userId: user.uid,
        content,
        createdAt: serverTimestamp(),
        userDisplayName: user.displayName || "Unknown",
        userPhotoURL: user.photoURL || ""
    });
};

export const subscribeToGoalComments = (goalId: string, callback: (comments: Comment[]) => void) => {
    const q = query(
        collection(db, `goals/${goalId}/comments`),
        // orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
        const comments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Comment[];
        comments.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
        callback(comments);
    });
};

export const deleteGoalComment = async (goalId: string, commentId: string) => {
    await deleteDoc(doc(db, `goals/${goalId}/comments`, commentId));
};

export const updateGoalComment = async (goalId: string, commentId: string, content: string) => {
    await updateDoc(doc(db, `goals/${goalId}/comments`, commentId), {
        content
    });
};

// --- Blog ---

export type BlogPost = {
    id: string;
    title: string;
    excerpt: string;
    content: string;
    coverImage?: string;
    userId: string;
    createdAt: Timestamp;
    assigneeIds?: string[];
    groupIds?: string[];
    tags?: string[];
    pinned?: boolean;
}

export const addBlogPost = async (title: string, excerpt: string, content: string, coverImage?: string, assigneeIds: string[] = [], groupIds: string[] = [], tags: string[] = [], pinned: boolean = false) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const orgId = userSnap.exists() ? userSnap.data().orgId : null;

    await addDoc(collection(db, "posts"), {
        title,
        excerpt,
        content,
        coverImage: coverImage || null,
        userId: user.uid,
        orgId: orgId || null,
        createdAt: serverTimestamp(),
        assigneeIds,
        groupIds,
        tags,
        pinned
    });
};

export const updateBlogPost = async (postId: string, data: Partial<BlogPost>) => {
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, data);
};

export const deleteBlogPost = async (postId: string) => {
    await deleteDoc(doc(db, "posts", postId));
};

export const subscribeToBlogPosts = (callback: (posts: BlogPost[]) => void) => {
    const user = auth.currentUser;
    if (!user) return () => { };

    let unsubscribe: () => void;

    (async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const orgId = userSnap.exists() ? userSnap.data().orgId : null;

        const q = orgId
            ? query(collection(db, "posts"), where("orgId", "==", orgId))
            : query(collection(db, "posts"), where("userId", "==", user.uid));

        unsubscribe = onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as BlogPost[];
            posts.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            callback(posts);
        });
    })();

    return () => {
        if (unsubscribe) unsubscribe();
    };
};

export const subscribeToGlobalFeed = (callback: (posts: Post[]) => void) => {
    const q = query(
        collection(db, "posts"),
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc"),
        limit(20)
    );

    return onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter((p: any) => p.visibility === "public") as Post[];

        // Hydrate authors (simple hydration for now)
        (async () => {
            const authorIds = [...new Set(posts.map(p => p.authorId).filter(id => id))];
            const authors: Record<string, any> = {};
            await Promise.all(authorIds.map(async (uid) => {
                if (uid && !authors[uid]) {
                    try {
                        const snap = await getDoc(doc(db, "users", uid));
                        if (snap.exists()) authors[uid] = snap.data();
                    } catch (e) {
                        console.error("Failed to hydrate user", uid, e);
                    }
                }
            }));

            const hydrated = posts.map(p => {
                const authorData = authors[p.authorId];
                return {
                    ...p,
                    author: authorData ? {
                        displayName: authorData.displayName || "User",
                        photoURL: authorData.photoURL || null
                    } : {
                        displayName: (p as any).displayName || "Unknown User",
                        photoURL: (p as any).photoURL || null
                    }
                };
            });
            callback(hydrated);
        })();
    });
};

export const subscribeToTrendingPosts = (callback: (posts: Post[]) => void) => {
    // Trending logic: Order by likes count (desc) then commentsCount (desc)
    // However, Firestore can't easily order by array length without a separate field.
    // For now, we'll order by commentsCount as a proxy for engagement, or just simple recent 50 and sort client side if needed.
    // Better approach: Order by createdAt (recent) then we sort client side for "Trending" to avoid complex indexes for now.
    // actually, let's just get recent 50 and sort by likes.length client side for the MVP "Trending".

    const q = query(
        collection(db, "posts"),
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc"),
        limit(50)
    );

    return onSnapshot(q, async (snapshot) => {
        const posts = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter((p: any) => p.visibility === "public") as Post[];

        // Hydrate authors
        // ... (We could batch fetch authors here, but for now relies on PostCard to fetch or basic hydration if author object exists)
        // Actually existing subscribeToFeed does author hydration. We should do it here too or reuse logic.
        // Let's copy basic hydration from subscribeToFeed if possible, or simpler:

        // Parallel fetch authors
        // Parallel fetch authors
        const authors: Record<string, any> = {};
        const authorIds = [...new Set(posts.map(p => p.authorId).filter(id => id))];

        await Promise.all(authorIds.map(async (uid) => {
            if (uid && !authors[uid]) {
                try {
                    const userSnap = await getDoc(doc(db, "users", uid));
                    if (userSnap.exists()) authors[uid] = userSnap.data();
                } catch (e) {
                    console.error("Failed to hydrate user", uid, e);
                }
            }
        }));

        const hydrated = posts.map(p => {
            const authorData = authors[p.authorId];
            return {
                ...p,
                author: authorData ? {
                    displayName: authorData.displayName || "User",
                    photoURL: authorData.photoURL || null
                } : {
                    displayName: (p as any).displayName || "Unknown User",
                    photoURL: (p as any).photoURL || null
                }
            };
        });

        // Sort by engagement (likes + comments)
        hydrated.sort((a, b) => {
            const scoreA = (a.likes?.length || 0) + (a.commentsCount || 0);
            const scoreB = (b.likes?.length || 0) + (b.commentsCount || 0);
            return scoreB - scoreA;
        });

        callback(hydrated.slice(0, 10)); // Top 10
    });
};

export const subscribeToUserPosts = (userId: string, callback: (posts: Post[]) => void) => {
    const q = query(
        collection(db, "posts"),
        where("authorId", "==", userId)
        // orderBy("createdAt", "desc") // Requires index
    );

    return onSnapshot(q, async (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Post[];

        // Sort client side to avoid index requirement for now
        posts.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        // Hydrate author (which is the user themselves mostly, but for consistency)
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : undefined;

        const hydrated = posts.map(p => ({
            ...p,
            author: userData as { displayName: string; photoURL: string; }
        }));

        callback(hydrated);
    });
};
export const getBlogPost = async (postId: string) => {
    // Since we are mostly using real-time subs, standard getDoc is useful for edit page
    const { getDoc } = await import("firebase/firestore");
    const docRef = doc(db, "posts", postId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as BlogPost;
    } else {
        return null;
    }
}


// --- Planner ---

export type PlanPhase = {
    id: number;
    title: string;
    duration: string;
    tasks: string[];
}

export type SavedPlan = {
    id: string;
    userId: string;
    title: string; // Auto-generated or user input
    phases: PlanPhase[];
    createdAt: Timestamp;
}

export const savePlan = async (title: string, phases: PlanPhase[]) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    await addDoc(collection(db, "plans"), {
        userId: user.uid,
        title,
        phases,
        createdAt: serverTimestamp()
    });
};

export const updatePlan = async (planId: string, title: string, phases: PlanPhase[]) => {
    const planRef = doc(db, "plans", planId);
    await updateDoc(planRef, {
        title,
        phases
    });
};

export const deletePlan = async (planId: string) => {
    await deleteDoc(doc(db, "plans", planId));
};

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
    let unsubscribe: Unsubscribe | undefined;

    import("./auth").then(async ({ getCurrentUser }) => {
        const user = await getCurrentUser();
        if (!user) return;

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const orgId = userSnap.exists() ? userSnap.data().orgId : null;

        const q = orgId
            ? query(collection(db, "tasks"), where("orgId", "==", orgId), orderBy("createdAt", "desc"))
            : query(collection(db, "tasks"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));

        unsubscribe = onSnapshot(q, (snapshot) => {
            const tasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Task[];

            // Filter out corrupt tasks where title is not a string (from previous bug)
            const validTasks = tasks.filter(t => {
                if (typeof t.title !== 'string') {
                    console.warn("Found corrupt task, deleting:", t);
                    // Async delete to clean up database
                    deleteDoc(doc(db, "tasks", t.id)).catch(e => console.error("Auto-delete failed", e));
                    return false;
                }
                return true;
            });

            callback(validTasks);
        });
    });

    return () => {
        if (unsubscribe) unsubscribe();
    };
};

export const subscribeToPlans = (callback: (plans: SavedPlan[]) => void) => {
    let unsubscribe: Unsubscribe | undefined;

    import("./auth").then(async ({ getCurrentUser }) => {
        const user = await getCurrentUser();
        if (!user) return;

        const q = query(
            collection(db, "plans"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
            const plans = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SavedPlan[];
            callback(plans);
        });
    });

    return () => {
        if (unsubscribe) unsubscribe();
    };
};

// --- Organization ---

export type Tag = {
    id: string;
    label: string;
    color?: string;
}

export type Organization = {
    id: string;
    name: string;
    ownerId: string;
    members: string[]; // array of userIds
    roles?: Record<string, 'owner' | 'member' | 'viewer'>;
    createdAt: Timestamp;
    isPersonal?: boolean;
    tags?: Tag[];
    tagline?: string;
    photoURL?: string;
    coverImage?: string;
}

export type OrganizationMember = {
    id: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    role: 'owner' | 'member' | 'viewer' | 'restricted';
}

export const createOrganization = async (name: string, isPersonal: boolean = false) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const orgRef = await addDoc(collection(db, "organizations"), {
        name,
        ownerId: user.uid,
        members: [user.uid],
        roles: { [user.uid]: 'owner' },
        createdAt: serverTimestamp(),
        isPersonal
    });

    // Link owner to org
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
        orgId: orgRef.id,
        email: user.email || "",
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        uid: user.uid
    }, { merge: true });

    // --- DATA MIGRATION ---
    // Move all existing user data to the new Organization
    const batch = writeBatch(db);
    let operationCount = 0;
    const MAX_BATCH_SIZE = 450; // Firestore limit is 500

    const migrateCollection = async (collectionName: string) => {
        const q = query(
            collection(db, collectionName),
            where("userId", "==", user.uid),
            where("orgId", "==", null)
        );
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
            if (operationCount < MAX_BATCH_SIZE) {
                batch.update(docSnap.ref, { orgId: orgRef.id });
                operationCount++;
            }
        });
    };

    await Promise.all([
        migrateCollection("tasks"),
        migrateCollection("goals"),
        migrateCollection("plans"),
        migrateCollection("posts")
    ]);

    if (operationCount > 0) {
        await batch.commit();
    }
    // ----------------------

    return orgRef.id;
};

export const getOrganization = async (orgId: string) => {
    const docRef = doc(db, "organizations", orgId);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } as Organization : null;
};

export const getUserOrganization = async (userId: string) => {
    const userSnap = await getDoc(doc(db, "users", userId));
    if (!userSnap.exists()) return null;

    const userData = userSnap.data();
    if (!userData.orgId) return null;

    return getOrganization(userData.orgId);
};

export const getUserOrganizations = async (userId: string) => {
    // Query organizations where user is a member
    const q = query(collection(db, "organizations"), where("members", "array-contains", userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Organization[];
};

export const switchOrganization = async (userId: string, orgId: string) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        orgId: orgId
    });
};



export type Invitation = {
    id: string;
    orgId: string;
    orgName: string;
    inviterId: string;
    email: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Timestamp;
}

export const addMemberToOrganization = async (orgId: string, email: string) => {
    // 1. Validate inputs
    if (!email || !orgId) throw new Error("Missing email or orgId");

    const { getCurrentUser } = await import("./auth");
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User not authenticated");

    // 2. Check if user is already a member
    const usersRef = collection(db, "users");
    const qUser = query(usersRef, where("email", "==", email));
    const userSnap = await getDocs(qUser);

    if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        const userData = userDoc.data();
        if (userData.orgId === orgId) {
            throw new Error("User is already a member of this organization.");
        }
    }

    // 3. Check if invite already exists
    const qInvite = query(
        collection(db, "invitations"),
        where("orgId", "==", orgId),
        where("email", "==", email),
        where("status", "==", "pending")
    );
    const inviteSnap = await getDocs(qInvite);
    if (!inviteSnap.empty) {
        throw new Error("An active invitation already exists for this email.");
    }

    // 4. Get Org Name
    const orgSnap = await getDoc(doc(db, "organizations", orgId));
    if (!orgSnap.exists()) throw new Error("Organization not found");
    const orgName = orgSnap.data().name;

    // 5. Create Invitation
    await addDoc(collection(db, "invitations"), {
        orgId,
        orgName,
        inviterId: currentUser.uid,
        email,
        status: 'pending',
        createdAt: serverTimestamp()
    });
};

export const getOrganizationInvitations = (orgId: string, callback: (invites: Invitation[]) => void) => {
    const q = query(
        collection(db, "invitations"),
        where("orgId", "==", orgId),
        where("status", "==", "pending")
    );
    return onSnapshot(q, (snapshot) => {
        const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invitation));
        callback(invites);
    });
};

export const getUserInvitations = (email: string, callback: (invites: Invitation[]) => void) => {
    const q = query(
        collection(db, "invitations"),
        where("email", "==", email),
        where("status", "==", "pending")
    );
    return onSnapshot(q, (snapshot) => {
        const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invitation));
        callback(invites);
    });
};

export const acceptInvitation = async (invitationId: string) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const inviteRef = doc(db, "invitations", invitationId);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) throw new Error("Invitation not found");
    const invite = inviteSnap.data() as Invitation;

    if (invite.status !== 'pending') throw new Error("Invitation is no longer valid");
    // Verify email matches current user (optional but recommended for security)
    if (user.email !== invite.email) throw new Error("This invitation was sent to a different email address.");

    const batch = writeBatch(db);

    // 1. Update Invitation Status
    batch.update(inviteRef, { status: 'accepted' });

    // 2. Add to Organization
    const orgRef = doc(db, "organizations", invite.orgId);
    batch.update(orgRef, {
        members: arrayUnion(user.uid),
        [`roles.${user.uid}`]: 'member'
    });

    // 3. Update User Org
    const userRef = doc(db, "users", user.uid);
    batch.set(userRef, { orgId: invite.orgId }, { merge: true });

    await batch.commit();
};

export const rejectInvitation = async (invitationId: string) => {
    const inviteRef = doc(db, "invitations", invitationId);
    await updateDoc(inviteRef, { status: 'rejected' });
};

export const cancelInvitation = async (invitationId: string) => {
    await deleteDoc(doc(db, "invitations", invitationId));
}

export const updateMemberRole = async (orgId: string, memberId: string, role: 'owner' | 'member' | 'viewer' | 'restricted') => {
    const orgRef = doc(db, "organizations", orgId);
    await updateDoc(orgRef, {
        [`roles.${memberId}`]: role
    });
};

export const updateMemberName = async (userId: string, newName?: string, photoURL?: string) => {
    const userRef = doc(db, "users", userId);
    const updates: any = {};
    if (newName) updates.displayName = newName;
    if (photoURL) updates.photoURL = photoURL;

    if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
    }
};

export const removeMemberFromOrganization = async (orgId: string, userId: string) => {
    const orgRef = doc(db, "organizations", orgId);

    // 1. Remove from members array and roles map
    // Note: Firestore update delete field syntax is somewhat complex dynamically
    // But we can just leave the role string there or try to delete it.
    // For simplicity, we just remove from 'members' array.
    await updateDoc(orgRef, {
        members: arrayRemove(userId),
        [`roles.${userId}`]: deleteField()
    });

    // 2. Unlink user from Org
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        orgId: null
    });

    // 3. Remove from any Groups in this Org
    const groupsQuery = query(collection(db, "groups"), where("orgId", "==", orgId), where("memberIds", "array-contains", userId));
    const groupsSnap = await getDocs(groupsQuery);

    const batch = writeBatch(db);
    groupsSnap.forEach(groupDoc => {
        batch.update(groupDoc.ref, {
            memberIds: arrayRemove(userId)
        });
    });

    if (!groupsSnap.empty) {
        await batch.commit();
    }
};

export const getOrganizationMembers = async (orgId: string) => {
    const orgSnap = await getDoc(doc(db, "organizations", orgId));
    if (!orgSnap.exists()) return [];

    const memberIds = orgSnap.data().members || [];
    if (memberIds.length === 0) return [];

    const memberPromises = memberIds.map((uid: string) => getDoc(doc(db, "users", uid)));
    const memberSnaps = await Promise.all(memberPromises);

    return memberSnaps.map(snap => {
        const data = snap.data();
        return {
            id: snap.id,
            email: data?.email,
            displayName: data?.displayName || "Unknown User",
            photoURL: data?.photoURL,
            role: orgSnap.data().roles?.[snap.id] || 'member'
        };
    });
};

// --- Users ---

export const createUserProfile = async (user: any) => {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        lastLogin: serverTimestamp()
    }, { merge: true });
};

// --- Daily Wins ---

export type DailyWin = {
    id?: string;
    userId: string;
    date: string; // YYYY-MM-DD
    wins: string[];
    createdAt: Timestamp;
}

export const saveDailyWins = async (wins: string[]) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const todayStr = new Date().toISOString().split('T')[0];
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const orgId = userSnap.exists() ? userSnap.data().orgId : null;

    // Check if doc exists for today
    const q = query(
        collection(db, "daily_wins"),
        where("userId", "==", user.uid),
        where("date", "==", todayStr)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        // Update existing
        const docId = snapshot.docs[0].id;
        await updateDoc(doc(db, "daily_wins", docId), {
            wins
        });
    } else {
        // Create new
        await addDoc(collection(db, "daily_wins"), {
            userId: user.uid,
            orgId: orgId || null,
            date: todayStr,
            wins,
            createdAt: serverTimestamp()
        });
    }
};

export const subscribeToTodayWins = (callback: (wins: string[]) => void) => {
    import("./auth").then(async ({ getCurrentUser }) => {
        const user = await getCurrentUser();
        if (!user) return;

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const orgId = userSnap.exists() ? userSnap.data().orgId : null;

        const todayStr = new Date().toISOString().split('T')[0];

        let q = query(
            collection(db, "daily_wins"),
            where("userId", "==", user.uid),
            where("date", "==", todayStr)
        );

        if (orgId) {
            q = query(
                collection(db, "daily_wins"),
                where("userId", "==", user.uid),
                where("orgId", "==", orgId),
                where("date", "==", todayStr)
            );
        }

        return onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data() as DailyWin;
                callback(data.wins || ["", "", ""]);
            } else {
                callback(["", "", ""]);
            }
        });
    });
    return () => { };
};

export const getDailyWinsHistory = async (limitCount: number = 7): Promise<DailyWin[]> => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) return [];

    const q = query(
        collection(db, "daily_wins"),
        where("userId", "==", user.uid)
    );

    const snapshot = await getDocs(q);
    const wins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyWin));

    // Client-side sort and limit to distinguish from index errors
    wins.sort((a, b) => b.date.localeCompare(a.date));
    return wins.slice(0, limitCount);
};

// --- Notes ---

// --- Groups ---

export type Group = {
    id: string;
    name: string;
    orgId: string;
    memberIds: string[];
    createdAt: Timestamp;
}

export const createGroup = async (name: string, orgId: string) => {
    await addDoc(collection(db, "groups"), {
        name,
        orgId,
        memberIds: [],
        createdAt: serverTimestamp()
    });
};

export const updateGroup = async (groupId: string, data: Partial<Group>) => {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, data);
};

export const deleteGroup = async (groupId: string) => {
    await deleteDoc(doc(db, "groups", groupId));
};

export const subscribeToGroups = (callback: (groups: Group[]) => void) => {
    const user = auth.currentUser;
    if (!user) return () => { };

    let unsubscribe: () => void;

    (async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const orgId = userSnap.exists() ? userSnap.data().orgId : null;

        if (!orgId) {
            callback([]);
            return;
        }

        const q = query(collection(db, "groups"), where("orgId", "==", orgId));

        unsubscribe = onSnapshot(q, (snapshot) => {
            const groups = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Group[];
            groups.sort((a, b) => a.name.localeCompare(b.name));
            callback(groups);
        });
    })();

    return () => {
        if (unsubscribe) unsubscribe();
    };
};

export const addMemberToGroup = async (groupId: string, userId: string) => {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
        memberIds: arrayUnion(userId)
    });
};

export const removeMemberFromGroup = async (groupId: string, userId: string) => {
    const groupRef = doc(db, "groups", groupId);
    const { getDoc } = await import("firebase/firestore");
    const groupSnap = await getDoc(groupRef);
    if (groupSnap.exists()) {
        const members = groupSnap.data().memberIds || [];
        await updateDoc(groupRef, {
            memberIds: members.filter((id: string) => id !== userId)
        });
    }
};




export type Note = {
    id: string;
    title: string;
    content: string;
    userId: string;
    orgId: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    assigneeIds?: string[];
    groupIds?: string[];
    color?: string;
    category?: string;
}

export const addNote = async (title: string, content: string, assigneeIds: string[] = [], groupIds: string[] = [], color: string = "bg-white", category: string = "general") => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const orgId = userSnap.exists() ? userSnap.data().orgId : null;

    await addDoc(collection(db, "notes"), {
        title,
        content,
        userId: user.uid,
        orgId: orgId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        assigneeIds,
        groupIds,
        color,
        category
    });
};

export const updateNote = async (noteId: string, title: string, content: string, assigneeIds?: string[], groupIds?: string[], color?: string, category?: string) => {
    const noteRef = doc(db, "notes", noteId);
    await updateDoc(noteRef, {
        title,
        content,
        updatedAt: serverTimestamp(),
        ...(assigneeIds ? { assigneeIds } : {}),
        ...(groupIds ? { groupIds } : {}),
        ...(color ? { color } : {}),
        ...(category ? { category } : {})
    });
};

export const deleteNote = async (noteId: string) => {
    await deleteDoc(doc(db, "notes", noteId));
};

export const subscribeToNotes = (callback: (notes: Note[]) => void) => {
    import("./auth").then(async ({ getCurrentUser }) => {
        const user = await getCurrentUser();
        if (!user) return;

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const orgId = userSnap.exists() ? userSnap.data().orgId : null;

        const q = orgId
            ? query(collection(db, "notes"), where("orgId", "==", orgId))
            : query(collection(db, "notes"), where("userId", "==", user.uid));

        return onSnapshot(q, (snapshot) => {
            const notes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Note[];
            // Sort by updated time desc (most recent first)
            notes.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            callback(notes);
        });
    });
    return () => { };
};

export const addBatchTasks = async (tasks: Partial<Task>[]) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const batch = writeBatch(db);
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const orgId = userSnap.exists() ? userSnap.data().orgId : null;

    tasks.forEach(task => {
        const newTaskRef = doc(collection(db, "tasks"));
        batch.set(newTaskRef, {
            title: task.title || "Untitled Task",
            completed: false,
            userId: user.uid,
            orgId: orgId || null,
            tag: "backlog",
            priority: "medium",
            createdAt: serverTimestamp(),
            ...task,
            dueDate: task.dueDate || null,
        });
    });

    await batch.commit();
}

export const updateOrganizationName = async (orgId: string, name: string) => {
    const orgRef = doc(db, "organizations", orgId);
    await updateDoc(orgRef, { name });
};

export const updateOrganization = async (orgId: string, data: Partial<Organization>) => {
    const orgRef = doc(db, "organizations", orgId);
    await updateDoc(orgRef, data);
};

export const subscribeToUserOrganizations = (userId: string, callback: (orgs: Organization[]) => void) => {
    const q = query(collection(db, "organizations"), where("members", "array-contains", userId));
    return onSnapshot(q, (snap) => {
        const orgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Organization[];
        callback(orgs);
    });
};

export const subscribeToUserProfile = (userId: string, callback: (user: any) => void) => {
    return onSnapshot(doc(db, "users", userId), (snap) => {
        if (snap.exists()) {
            callback({ id: snap.id, ...snap.data() });
        }
    });
};
export const deleteOrganization = async (orgId: string) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const orgRef = doc(db, "organizations", orgId);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) throw new Error("Organization not found");

    const orgData = orgSnap.data();
    if (orgData.ownerId !== user.uid) {
        throw new Error("Only the owner can delete the organization");
    }

    const collectionsToDelete = [
        "tasks", "goals", "notes", "posts", "plans", "groups", "daily_wins", "task_columns"
    ];

    const batch = writeBatch(db);
    let count = 0;

    // 1. Delete all associated content
    for (const colName of collectionsToDelete) {
        const q = query(collection(db, colName), where("orgId", "==", orgId));
        const snap = await getDocs(q);
        snap.forEach(d => {
            batch.delete(d.ref);
            count++;
        });
    }

    // 2. Unlink all members
    const members = orgData.members || [];
    for (const memberId of members) {
        const userRef = doc(db, "users", memberId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().orgId === orgId) {
            batch.update(userRef, { orgId: null });
            count++;
        }
    }

    // 3. Delete organization itself
    batch.delete(orgRef);

    if (count > 0 || true) { // Always commit if we deleted the org
        await batch.commit();
    }
};
// --- MVS ---

export const subscribeToMVS = (orgId: string, callback: (data: MVS | null) => void): Unsubscribe => {
    const mvsRef = doc(db, "organizations", orgId, "mvs", "current");
    return onSnapshot(mvsRef, (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() } as MVS);
        } else {
            callback(null);
        }
    });
};

export const subscribeToOrganization = (orgId: string, callback: (org: Organization) => void) => {
    return onSnapshot(doc(db, "organizations", orgId), (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() } as Organization);
        }
    });
};

export const updateMVS = async (orgId: string, data: Partial<MVS>) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const mvsRef = doc(db, "organizations", orgId, "mvs", "current");
    await setDoc(mvsRef, {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
    }, { merge: true });
};
export const addTagToOrganization = async (orgId: string, label: string, color?: string) => {
    const orgRef = doc(db, "organizations", orgId);
    const newTag: Tag = {
        id: Math.random().toString(36).substring(2, 9),
        label,
        color: color || "bg-muted/30"
    };
    await updateDoc(orgRef, {
        tags: arrayUnion(newTag)
    });
    return newTag;
};

export const updateTagInOrganization = async (orgId: string, tagId: string, newLabel: string, newColor?: string) => {
    const orgRef = doc(db, "organizations", orgId);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) return;

    const tags = orgSnap.data().tags || [];
    const updatedTags = tags.map((t: Tag) =>
        t.id === tagId ? { ...t, label: newLabel, color: newColor || t.color } : t
    );

    await updateDoc(orgRef, { tags: updatedTags });
};

export const deleteTagFromOrganization = async (orgId: string, tagId: string) => {
    const orgRef = doc(db, "organizations", orgId);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) return;

    const tags = orgSnap.data().tags || [];
    const updatedTags = tags.filter((t: Tag) => t.id !== tagId);

    await updateDoc(orgRef, { tags: updatedTags });
};

// --- Friends & Messaging ---

export type Friendship = {
    id: string;
    requesterId: string;
    recipientId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    friend?: any; // Hydrated user data
}

export type Message = {
    id: string;
    senderId: string;
    content: string;
    createdAt: Timestamp;
    readBy: string[];
}

export type Chat = {
    id: string;
    participants: string[];
    lastMessage?: string;
    lastMessageTime?: Timestamp;
    unreadCount?: Record<string, number>;
    otherUser?: any; // Hydrated user data
}

// Friends
export const sendFriendRequest = async (recipientId: string) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    // Check if friendship already exists
    const q1 = query(
        collection(db, "friendships"),
        where("requesterId", "==", user.uid),
        where("recipientId", "==", recipientId)
    );
    const q2 = query(
        collection(db, "friendships"),
        where("requesterId", "==", recipientId),
        where("recipientId", "==", user.uid)
    );

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    if (!snap1.empty || !snap2.empty) return; // Already exists

    await addDoc(collection(db, "friendships"), {
        requesterId: user.uid,
        recipientId: recipientId,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
};

export const acceptFriendRequest = async (friendshipId: string) => {
    await updateDoc(doc(db, "friendships", friendshipId), {
        status: 'accepted',
        updatedAt: serverTimestamp()
    });
};

export const rejectFriendRequest = async (friendshipId: string) => {
    await updateDoc(doc(db, "friendships", friendshipId), {
        status: 'rejected',
        updatedAt: serverTimestamp()
    });
};

export const subscribeToFriendships = (callback: (friendships: Friendship[]) => void) => {
    const user = auth.currentUser;
    if (!user) return () => { };

    const q = query(
        collection(db, "friendships"),
        or(
            where("requesterId", "==", user.uid),
            where("recipientId", "==", user.uid)
        )
    );

    return onSnapshot(q, async (snapshot) => {
        const friendships = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Friendship[];

        // Hydrate friend data
        const hydrated = await Promise.all(friendships.map(async (f) => {
            const friendId = f.requesterId === user.uid ? f.recipientId : f.requesterId;
            const friendSnap = await getDoc(doc(db, "users", friendId));
            return {
                ...f,
                friend: friendSnap.exists() ? { id: friendSnap.id, ...friendSnap.data() } : null
            };
        }));

        callback(hydrated);
    });
};

export const searchUsers = async (searchTerm: string) => {
    // Simple search by email or display name (client-side filtering for demo/MVP)
    // In prod, use Algolia or similar
    const q = query(collection(db, "users"), limit(20));
    const snap = await getDocs(q);
    const term = searchTerm.toLowerCase();

    return snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(u =>
            u.email?.toLowerCase().includes(term) ||
            u.displayName?.toLowerCase().includes(term)
        );
};

// Messaging
export const createOrGetChat = async (otherUserId: string) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    // Look for existing chat
    const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
    );

    const snap = await getDocs(q);
    const existing = snap.docs.find(doc => {
        const data = doc.data();
        return data.participants.includes(otherUserId);
    });

    if (existing) return existing.id;

    // Create new
    const ref = await addDoc(collection(db, "chats"), {
        participants: [user.uid, otherUserId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCount: {
            [user.uid]: 0,
            [otherUserId]: 0
        }
    });
    return ref.id;
};

export const sendMessage = async (chatId: string, content: string) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) return;

    const chatData = chatSnap.data();
    const otherUserId = chatData.participants.find((id: string) => id !== user.uid);

    const batch = writeBatch(db);

    // Add message
    const msgRef = doc(collection(db, `chats/${chatId}/messages`));
    batch.set(msgRef, {
        senderId: user.uid,
        content,
        createdAt: serverTimestamp(),
        readBy: [user.uid]
    });

    // Update chat metadata
    batch.update(chatRef, {
        lastMessage: content,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
        [`unreadCount.${otherUserId}`]: (chatData.unreadCount?.[otherUserId] || 0) + 1
    });

    await batch.commit();
};

export const subscribeToChats = (callback: (chats: Chat[]) => void) => {
    const user = auth.currentUser;
    if (!user) return () => { };

    const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid),
        orderBy("updatedAt", "desc")
    );

    return onSnapshot(q, async (snapshot) => {
        const chats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Chat[];

        // Hydrate other user
        const hydrated = await Promise.all(chats.map(async (c) => {
            const otherId = c.participants.find(id => id !== user.uid);
            if (!otherId) return c;
            const uSnap = await getDoc(doc(db, "users", otherId));
            return {
                ...c,
                otherUser: uSnap.exists() ? { id: uSnap.id, ...uSnap.data() } : null
            };
        }));

        callback(hydrated);
    });
};

export const subscribeToMessages = (chatId: string, callback: (messages: Message[]) => void) => {
    const q = query(
        collection(db, `chats/${chatId}/messages`),
        orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Message[];
        callback(messages);
    });
};

export const markChatRead = async (chatId: string) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) return;

    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
        [`unreadCount.${user.uid}`]: 0
    });
};
export interface SocialComment {
    id: string;
    authorId: string;
    content: string;
    createdAt: any;
    author?: {
        displayName: string;
        photoURL: string;
    };
}

export interface Attachment {
    type: 'image' | 'goal' | 'task' | 'note' | 'blog';
    id: string; // URL for image, ID for others
    title: string;
    preview?: string;
}

export interface Post {
    id: string;
    authorId: string;
    content: string; // Now acts as "body"
    title?: string;
    description?: string;
    attachments?: Attachment[];
    images: string[]; // Kept for backward compat, but main images should go to attachments? Let's sync them.
    tags: string[];
    likes: string[];
    commentsCount: number;
    visibility: 'public' | 'private';
    createdAt: any;
    updatedAt: any;
    author?: {
        displayName: string;
        photoURL: string;
    };
}

// --- SHARING / SOCIAL NETWORK FUNCTIONS ---

export const createPost = async (
    content: string,
    images: string[] = [],
    tags: string[] = [],
    title: string = "",
    description: string = "",
    attachments: Attachment[] = [],
    visibility: 'public' | 'private' = 'public'
) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) throw new Error("Must be logged in");

    // Sync validation: if images are passed in 'images' array, add them to attachments if not present?
    // For simplicity, we trust the caller.

    await addDoc(collection(db, "posts"), {
        authorId: user.uid,
        content: content || "",
        title: title || "",
        description: description || "",
        attachments,
        images,
        tags,
        likes: [],
        commentsCount: 0,
        visibility,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
};

export const updatePost = async (postId: string, data: Partial<Post>) => {
    const ref = doc(db, "posts", postId);
    await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp()
    });
};

export const deletePost = async (postId: string) => {
    await deleteDoc(doc(db, "posts", postId));
};

export const subscribeToFeed = (participantIds: string[], callback: (posts: Post[]) => void) => {
    // Note: 'in' query supports max 10 values normally, 30 with optimization. 
    // For MVP, we pass current user + friends. If > 30, we might need multiple queries or client-side filtering.
    // Here strictly assuming < 30 friends for MVP.

    // Fallback: if empty friends list, just show own posts
    const authors = participantIds.length > 0 ? participantIds : ["OnlyMe"];

    const q = query(
        collection(db, "posts"),
        where("authorId", "in", authors),
        orderBy("createdAt", "desc"),
        limit(50)
    );

    return onSnapshot(q, async (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Post[];

        // Hydrate authors
        const hydrated = await Promise.all(posts.map(async (p) => {
            const uSnap = await getDoc(doc(db, "users", p.authorId));
            return {
                ...p,
                author: uSnap.exists() ? uSnap.data() : null
            };
        }));

        callback(hydrated as Post[]);
    });
};

export const toggleLikePost = async (postId: string, userId: string, isLiked: boolean) => {
    const ref = doc(db, "posts", postId);
    if (isLiked) {
        // Unlike
        await updateDoc(ref, {
            likes: arrayRemove(userId)
        });
    } else {
        // Like
        await updateDoc(ref, {
            likes: arrayUnion(userId)
        });
    }
};

export const addComment = async (postId: string, content: string) => {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) return;

    const batch = writeBatch(db);
    const commentRef = doc(collection(db, `posts/${postId}/comments`));
    const postRef = doc(db, "posts", postId);

    batch.set(commentRef, {
        authorId: user.uid,
        content,
        createdAt: serverTimestamp()
    });

    batch.update(postRef, {
        commentsCount: increment(1)
    });

    await batch.commit();
};

export const subscribeToComments = (postId: string, callback: (comments: SocialComment[]) => void) => {
    const q = query(
        collection(db, `posts/${postId}/comments`),
        orderBy("createdAt", "asc")
    );

    return onSnapshot(q, async (snapshot) => {
        const comments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as SocialComment[];

        // Hydrate authors
        const hydrated = await Promise.all(comments.map(async (c) => {
            const uSnap = await getDoc(doc(db, "users", c.authorId));
            return {
                ...c,
                author: uSnap.exists() ? uSnap.data() : null
            };
        }));

        callback(hydrated as SocialComment[]);
    });
};
