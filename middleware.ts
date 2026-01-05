import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
    // TODO: Add Firebase Auth protection here if needed (e.g., verifying session cookie).
    // For now, we rely on client-side protection in the components.
    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
