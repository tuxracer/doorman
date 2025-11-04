import { NextResponse } from "next/server";
import {
    DoorUpdateSchema,
} from "@/schemas/door";
import { DoorStore } from "@/stores/door";

export const dynamic = "force-dynamic";

export async function GET() {
    const door = await DoorStore.get();
    return NextResponse.json(door);
}

export async function PATCH(request: Request) {
    const patch = DoorUpdateSchema.parse(await request.json());

    const updated = await DoorStore.update(patch);
    return NextResponse.json(updated);
}

export async function DELETE() {
    await DoorStore.delete();
    return new NextResponse(null, { status: 204 });
}
