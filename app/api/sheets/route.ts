import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

const getSheetsClient = async () => {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || "";
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || "";
  const privateKey = rawKey.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google credentials");
  }
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get("sheetId");
    const range = searchParams.get("range");
    if (!sheetId || !range) {
      return NextResponse.json({ error: "sheetId and range are required" }, { status: 400 });
    }
    const sheets = await getSheetsClient();
    const result = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
    return NextResponse.json({ values: result.data.values || [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sheetId = body?.sheetId as string | undefined;
    const range = body?.range as string | undefined;
    const values = body?.values as string[][] | undefined;
    if (!sheetId || !range || !Array.isArray(values) || values.length === 0) {
      return NextResponse.json({ error: "sheetId, range, and values are required" }, { status: 400 });
    }
    const sheets = await getSheetsClient();
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    return NextResponse.json({ updates: result.data.updates }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const sheetId = body?.sheetId as string | undefined;
    const range = body?.range as string | undefined;
    const values = body?.values as string[][] | undefined;
    if (!sheetId || !range) {
      return NextResponse.json({ error: "sheetId and range are required" }, { status: 400 });
    }
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range });
    if (Array.isArray(values) && values.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: { values },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
