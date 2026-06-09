import { GoogleGenAI } from "@google/genai";
import { Appointment, Service, Professional } from "../types";

// Initialize Gemini
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing. AI features will return mock responses.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateWhatsAppMessage = async (
  appointment: Appointment,
  service: Service,
  professional: Professional
): Promise<string> => {
  const ai = getAIClient();
  
  // Fallback if no API key
  if (!ai) {
    return `Olá ${appointment.userName}, confirmamos seu agendamento de ${service.name} para o dia ${appointment.date} às ${appointment.time} com ${professional.name}.`;
  }

  try {
    const prompt = `
      Você é um assistente virtual de um salão de beleza chique e acolhedor chamado "BeautyBook".
      Escreva uma mensagem curta, educada e amigável para ser enviada via WhatsApp para o cliente.
      
      Detalhes do agendamento:
      Cliente: ${appointment.userName}
      Serviço: ${service.name}
      Profissional: ${professional.name}
      Data: ${appointment.date}
      Horário: ${appointment.time}
      Status atual: ${appointment.status}

      A mensagem deve servir como um lembrete ou confirmação. Inclua emojis relevantes.
      Não use formatação markdown (negrito/itálico) pois o link do WhatsApp pode não renderizar bem na url. Apenas texto simples.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "Erro ao gerar mensagem.";
  } catch (error) {
    console.error("Error generating message:", error);
    return `Olá ${appointment.userName}, lembrete do seu agendamento de ${service.name} às ${appointment.time}.`;
  }
};

export const analyzeSentiment = async (review: string): Promise<string> => {
   const ai = getAIClient();
    if (!ai) return "Neutro";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the sentiment of this beauty salon review. Reply with ONLY one word: 'Positivo', 'Negativo', or 'Neutro'. Review: "${review}"`
        });
        return response.text?.trim() || "Neutro";
    } catch (e) {
        return "Neutro";
    }
}