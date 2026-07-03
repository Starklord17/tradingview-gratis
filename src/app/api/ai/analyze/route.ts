import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { symbol, timeframe, currentPrice, rsi, macd, ema20, ema50, ema200, bb, supertrend } = await request.json();

    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    const formattedSymbol = symbol.toUpperCase();

    // Construct the context prompt containing real market data
    const prompt = `Analizá técnicamente el par de criptomonedas ${formattedSymbol} en la temporalidad de ${timeframe}.
Los datos e indicadores actuales son:
- Precio Actual: $${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
- RSI (14): ${rsi !== null && rsi !== undefined ? rsi.toFixed(2) : "No activo"}
- EMA 20: ${ema20 !== null && ema20 !== undefined ? `$${ema20.toLocaleString()}` : "No activa"}
- EMA 50: ${ema50 !== null && ema50 !== undefined ? `$${ema50.toLocaleString()}` : "No activa"}
- EMA 200: ${ema200 !== null && ema200 !== undefined ? `$${ema200.toLocaleString()}` : "No activa"}
- MACD: ${macd ? `Línea: ${macd.macd.toFixed(4)}, Señal: ${macd.signal.toFixed(4)}, Histograma: ${macd.histogram.toFixed(4)}` : "No activo"}
- Bandas de Bollinger (20, 2): ${bb ? `Superior: $${bb.upper.toLocaleString()}, Base: $${bb.basis.toLocaleString()}, Inferior: $${bb.lower.toLocaleString()}` : "No activo"}
- SuperTrend (10, 3): ${supertrend ? `Valor: $${supertrend.value.toLocaleString()}, Tendencia: ${supertrend.trend === "up" ? "Alcista (Bullish)" : "Bajista (Bearish)"}` : "No activo"}

Por favor, generá un informe de análisis técnico detallado y conciso utilizando Markdown. Estructurá el informe en las siguientes secciones claramente legibles:
1. **Resumen de la Tendencia**: Evaluá si la tendencia es alcista, bajista o neutral basándote en el SuperTrend y las EMAs.
2. **Lectura de Indicadores**: Analizá el RSI (sobrecompra/sobreventa) y el MACD.
3. **Soportes y Resistencias**: Definí niveles clave estimándolos a partir de las Bandas de Bollinger y las EMAs.
4. **Recomendación / Escenario de Trading**: Proponé un escenario (Compra, Venta o Espera) con posibles zonas de entrada y stop loss lógico.

Mantené el tono profesional, analítico y en español.`;

    // 1. Try Gemini API if key is available
    if (geminiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return NextResponse.json({ text });
        }
      } else {
        console.error("Gemini API returned error:", await response.text());
      }
    }

    // 2. Try Anthropic/Claude API if key is available
    if (anthropicKey) {
      const url = "https://api.anthropic.com/v1/messages";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text;
        if (text) {
          return NextResponse.json({ text });
        }
      } else {
        console.error("Anthropic API returned error:", await response.text());
      }
    }

    // 3. Fallback: Intelligent mock analysis using actual data
    const rsiVal = rsi || 50;
    const isEmaBullish = ema20 && ema50 ? ema20 > ema50 : true;
    const stTrend = supertrend ? supertrend.trend : (isEmaBullish ? "up" : "down");

    const trendText = stTrend === "up" 
      ? `📈 **Alcista**: El SuperTrend está en modo alcista con soporte en $${(supertrend?.value || currentPrice * 0.97).toLocaleString(undefined, { minimumFractionDigits: 2 })}. ${
          isEmaBullish ? "Además, la EMA 20 cotiza por encima de la EMA 50, confirmando el impulso alcista." : "No obstante, las EMAs muestran cierta compresión."
        }`
      : `📉 **Bajista**: El SuperTrend está en modo bajista con resistencia de parada en $${(supertrend?.value || currentPrice * 1.03).toLocaleString(undefined, { minimumFractionDigits: 2 })}. El precio encuentra presión de venta en el corto plazo.`;

    const rsiText = rsiVal > 70
      ? `⚠️ **Sobrecompra (RSI: ${rsiVal.toFixed(2)})**: El oscilador RSI ingresó en zona de sobrecompra. El impulso alcista es fuerte, pero incrementa la probabilidad de una toma de ganancias o consolidación en el corto plazo.`
      : rsiVal < 30
      ? `🟢 **Sobreventa (RSI: ${rsiVal.toFixed(2)})**: El RSI cotiza en zona de sobreventa extrema. Sugiere agotamiento vendedor y la posibilidad de un rebote técnico alcista.`
      : `🔄 **Neutral (RSI: ${rsiVal.toFixed(2)})**: El oscilador se encuentra en rango intermedio, sin indicar condiciones de agotamiento ni sobreextensión de tendencia.`;

    const bbText = bb
      ? `Las Bandas de Bollinger se encuentran en ${
          Math.abs(bb.upper - bb.lower) / bb.basis < 0.05 ? "fase de compresión (Squeeze)" : "fase de expansión"
        }. La banda superior actúa como resistencia inmediata en $${bb.upper.toLocaleString(undefined, { minimumFractionDigits: 2 })}, mientras que la inferior brinda soporte en $${bb.lower.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`
      : "Bandas de Bollinger inactivas. Active el indicador en el gráfico para obtener zonas de volatilidad.";

    const recText = stTrend === "up"
      ? `Se sugiere buscar posiciones de **COMPRA (Long)**. 
      - **Entrada Ideal**: Testeo de soporte o retroceso saludable cerca de la EMA 20 ($${(ema20 || currentPrice * 0.99).toLocaleString(undefined, { minimumFractionDigits: 2 })}).
      - **Stop Loss**: Por debajo de la línea del SuperTrend ($${(supertrend?.value || currentPrice * 0.96).toLocaleString(undefined, { minimumFractionDigits: 2 })}).`
      : `Se sugiere buscar posiciones de **VENTA (Short)** o permanecer en **ESPERA**.
      - **Entrada Ideal**: En rebotes técnicos hacia la EMA 20 ($${(ema20 || currentPrice * 1.01).toLocaleString(undefined, { minimumFractionDigits: 2 })}).
      - **Stop Loss**: Por encima de la línea del SuperTrend ($${(supertrend?.value || currentPrice * 1.04).toLocaleString(undefined, { minimumFractionDigits: 2 })}).`;

    const mockReport = `⚠️ **[Modo Demostración]** *Configurá GEMINI_API_KEY en tu .env.local para habilitar análisis de IA real.*\n\n### Análisis Técnico de ${formattedSymbol} (${timeframe})\n\n#### 1. Resumen de la Tendencia\n${trendText}\n\n#### 2. Lectura de Indicadores\n- **RSI (14)**: ${rsiText}\n- **MACD**: ${
      macd 
        ? `Línea MACD en ${macd.macd.toFixed(4)} y Señal en ${macd.signal.toFixed(4)}. El histograma (${macd.histogram.toFixed(4)}) denota un momentum ${macd.histogram >= 0 ? "alcista" : "bajista"}.`
        : "MACD inactivo. Active el indicador para evaluar momentum."
    }\n\n#### 3. Soportes y Resistencias\n- **Resistencia Inmediata**: $${(bb?.upper || currentPrice * 1.02).toLocaleString(undefined, { minimumFractionDigits: 2 })}\n- **Soporte Clave**: $${(bb?.lower || currentPrice * 0.98).toLocaleString(undefined, { minimumFractionDigits: 2 })}\n- **Detalle de Volatilidad**: ${bbText}\n\n#### 4. Recomendación / Escenario de Trading\n${recText}`;

    return NextResponse.json({ text: mockReport });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
