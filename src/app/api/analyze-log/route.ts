import { type NextRequest, NextResponse } from "next/server";

const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB || "50");
const MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
const ALLOWED_EXTENSIONS = [".log", ".txt"];

export async function POST(request: NextRequest) {
  try {
    // 1. Parse form data
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 2. Validate file extension
    const filename = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
      filename.endsWith(ext),
    );

    if (!hasValidExtension) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // 3. Validate file size
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${MAX_UPLOAD_SIZE_MB}MB`,
        },
        { status: 413 },
      );
    }

    // 4. Forward file to FastAPI
    const fastapiFormData = new FormData();
    fastapiFormData.append("file", file);

    const response = await fetch(`${FASTAPI_URL}/analyze-log`, {
      method: "POST",
      body: fastapiFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            errorData.detail || `Analysis service error (${response.status})`,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in analyze-log route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
