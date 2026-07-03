import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { symbol, price, condition, actualPrice, chatId } = await request.json();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN is not configured on the server" },
        { status: 500 }
      );
    }

    const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;
    if (!targetChatId) {
      return NextResponse.json(
        { error: "Telegram Chat ID is not specified" },
        { status: 400 }
      );
    }

    const direction = condition === "above" ? "📈 cruzó hacia arriba" : "📉 cruzó hacia abajo";
    const symbolFormatted = symbol.toUpperCase();
    const formattedPrice = price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
    const formattedActualPrice = actualPrice.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });

    const text = `🔔 *¡Alerta de Precio!*\n\nEl par *${symbolFormatted}* ${direction} los *$${formattedPrice}*.\n\n💵 *Precio Actual*: $${formattedActualPrice}\n⏰ *Hora*: ${new Date().toLocaleTimeString()}`;

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: text,
        parse_mode: "Markdown",
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Telegram API error: ${errorText}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
