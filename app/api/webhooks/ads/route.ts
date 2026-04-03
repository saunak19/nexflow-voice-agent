import { NextResponse } from "next/server";
import prisma from "@/lib/db"; // Adjust path if your prisma client is elsewhere
import { getTenantVoiceProvider } from "@/lib/voice-providers";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Extract data sent by Zapier/Pabbly/Meta
    const { phone_number, ad_id, ad_name, agent_id, tenant_id } = body;

    if (!phone_number || !agent_id || !tenant_id) {
      return NextResponse.json(
        { error: "Missing required fields (phone_number, agent_id, tenant_id)" },
        { status: 400 }
      );
    }

    const voiceProvider = await getTenantVoiceProvider(tenant_id);

    // 2. Trigger the call in Bolna and pass the personalized data
    const bolnaResponse = await voiceProvider.triggerCall({
      agent_id: agent_id,
      recipient_phone_number: phone_number,
      user_data: {
        ad_id: ad_id || "unknown",
        creative_name: ad_name || "Organic"
      }
    });

    // 3. Save the execution to your database with the Ad tracking info
    await prisma.callExecution.create({
      data: {
        tenantId: tenant_id,
        agentId: agent_id,
        bolnaExecutionId: bolnaResponse.call_id,
        phoneNumber: phone_number,
        status: "queued",
        adId: ad_id,
        creativeName: ad_name
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Lead call triggered successfully",
      call_id: bolnaResponse.call_id 
    });

 } catch (error) {
    console.error("Lead Webhook Error:", error);
    return NextResponse.json({ error: "Failed to process lead" }, { status: 500 });
  }
}
