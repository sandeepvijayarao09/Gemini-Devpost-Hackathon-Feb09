
import { GoogleGenAI, Type } from "@google/genai";
import { CanvasNode, AppMode, ChatSession } from '../types';
import { GEMINI_RESEARCHER_MODEL, GEMINI_CREATOR_MODEL } from '../constants';

const apiKey = process.env.API_KEY || '';

const getAiClient = () => {
  if (!apiKey) {
    console.error("API_KEY is missing from process.env");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to format grounding chunks (search sources) into Markdown
const formatGroundingMetadata = (candidate: any): string => {
  const chunks = candidate?.groundingMetadata?.groundingChunks;
  if (!chunks || chunks.length === 0) return '';

  let sourcesMd = '\n\n---\n**Verified Web Sources:**\n';
  chunks.forEach((chunk: any, index: number) => {
    if (chunk.web?.uri && chunk.web?.title) {
      sourcesMd += `${index + 1}. [${chunk.web.title}](${chunk.web.uri})\n`;
    }
  });
  return sourcesMd;
};

// Helper to construct parts from nodes with optimization
const buildContentParts = (nodes: CanvasNode[], promptText: string) => {
  const rawParts: any[] = [];
  
  // 1. Add Context Nodes FIRST
  nodes.forEach(n => {
    if (n.data && n.mimeType) {
      // It's a binary file (PDF, Video, Image)
      // We explicitly separate the label from the binary data to ensure clarity
      rawParts.push({ text: `\n[Reference File (ID: ${n.id}): ${n.title}]` });
      rawParts.push({ 
        inlineData: { 
          mimeType: n.mimeType, 
          data: n.data 
        } 
      });
    } else {
      // It's text (Extracted from DOCX, or Raw Text, or Link Description)
      const contentStr = n.content ? n.content.substring(0, 500000) : "No text content.";
      rawParts.push({ 
        text: `\n[Source (ID: ${n.id}): ${n.title} (${n.type})]\n${contentStr}` 
      });
    }
  });

  // 2. Add the User Prompt LAST
  rawParts.push({ text: `\n\n---\n${promptText}` });

  // 3. Optimize: Merge adjacent text parts to prevent fragmentation issues
  const optimizedParts: any[] = [];
  let currentTextBuffer = "";

  rawParts.forEach(part => {
    if (part.text) {
      currentTextBuffer += part.text;
    } else if (part.inlineData) {
      // If we have accumulated text, push it first
      if (currentTextBuffer) {
        optimizedParts.push({ text: currentTextBuffer });
        currentTextBuffer = "";
      }
      // Push the binary part
      optimizedParts.push(part);
    }
  });

  // Push remaining text if any
  if (currentTextBuffer) {
    optimizedParts.push({ text: currentTextBuffer });
  }

  return optimizedParts;
};

// Helper to format archived sessions for context
const formatArchivedSessions = (sessions: ChatSession[], currentId: string): string => {
  const archives = sessions.filter(s => s.id !== currentId && s.messages.length > 0);
  if (archives.length === 0) return "No previous chat history available.";

  return archives.map(s => {
    const transcript = s.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    return `--- START OF ARCHIVED CHAT: "${s.title}" (${new Date(s.timestamp).toLocaleDateString()}) ---\n${transcript}\n--- END OF ARCHIVED CHAT ---`;
  }).join('\n\n');
};

export const getCreativeInspiration = async (): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "Error: API Key missing.";

    // High temperature for creativity
    const config = {
        temperature: 1.2,
        topK: 40
    };

    const prompt = `Generate a single, short, provocative "Oblique Strategy" or "Creative Constraint" to unblock a creator. 
    It should be abstract but actionable. 
    Examples: "Honor thy error as a hidden intention.", "What would your closest friend do?", "Work at a different speed."
    
    Return JUST the phrase.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config
        });
        return response.text || "Trust your instinct.";
    } catch (e) {
        return "Look closely at the most embarrassing detail.";
    }
};

export const enrichSourceContent = async (url: string, type: 'video' | 'website'): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Error: API Key missing.";

  // Use a model that supports Google Search well
  const model = "gemini-3-flash-preview"; 
  
  const prompt = type === 'video' 
    ? `Analyze the YouTube video at: ${url}. Provide a comprehensive summary of the content, speakers, and key points.`
    : `Read and summarize the content of the website at: ${url}. Capture the main text, arguments, and details.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    let text = response.text || "";
    const grounding = formatGroundingMetadata(response.candidates?.[0]);
    return text + grounding;
  } catch (e: any) {
    console.error("Enrichment error", e);
    return `Failed to fetch content. Error: ${e.message || e}`;
  }
};

export const generatePodcastAudio = async (nodes: CanvasNode[]): Promise<{audioData: string | null, error?: string}> => {
    const ai = getAiClient();
    if (!ai) return { audioData: null, error: "API Key Missing" };

    const prompt = `
    Generate an engaging, lively audio discussion between two podcast hosts (Host 1 and Host 2).
    They are discussing the key insights found in the attached files.
    
    Style Guide:
    - Host 1 (Kore): Analytical, thoughtful, asks deep questions.
    - Host 2 (Fenrir): Energetic, enthusiastic, provides metaphors and answers.
    - Keep it under 2 minutes.
    - Start directly with the conversation, no "Here is a podcast" preamble.
    `;

    const parts = buildContentParts(nodes, prompt);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ role: 'user', parts }],
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            { speaker: 'Host 1', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                            { speaker: 'Host 2', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } }
                        ]
                    }
                }
            }
        });

        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) return { audioData: null, error: "No audio generated" };

        return { audioData };

    } catch (e: any) {
        console.error("Podcast Generation Error", e);
        return { audioData: null, error: e.message };
    }
};

export const generateImage = async (prompt: string): Promise<{ base64: string, mimeType: string } | null> => {
    const ai = getAiClient();
    if (!ai) return null;

    try {
        // Using Gemini 2.5 Flash Image for fast generation
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                // No specific image config needed for basic generation in this SDK version,
                // the model outputs image parts automatically.
            }
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return {
                        base64: part.inlineData.data,
                        mimeType: part.inlineData.mimeType || 'image/png'
                    };
                }
            }
        }
        return null;
    } catch (e) {
        console.error("Image Gen Error", e);
        return null;
    }
};

export const generateCitation = async (node: CanvasNode): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "Error: API Key missing";

    const parts = buildContentParts([node], "Generate citations for this source.");
    
    // Append the specific instruction
    parts.push({ 
        text: `\nBased on the source provided above, generate a Citation Block.
        If specific metadata (Author, Date) is missing, infer it from the context or leave it generic.
        
        Return ONLY a JSON object with this structure:
        {
          "apa": "APA style citation",
          "mla": "MLA style citation",
          "chicago": "Chicago style citation",
          "bibtex": "BibTeX entry"
        }` 
    });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: 'user', parts }],
            config: { responseMimeType: "application/json" }
        });
        
        const json = JSON.parse(response.text || "{}");
        
        // Format as Markdown for the UI
        return `**APA:** ${json.apa || 'N/A'}\n\n**MLA:** ${json.mla || 'N/A'}\n\n**Chicago:** ${json.chicago || 'N/A'}\n\n**BibTeX:**\n\`\`\`bibtex\n${json.bibtex || 'N/A'}\n\`\`\``;
    } catch (e) {
        return "Failed to generate citation. Please ensure the node has content.";
    }
};

export const organizeCanvasNodes = async (nodes: CanvasNode[]): Promise<{ clusters: { title: string, nodeIds: string[] }[] }> => {
    const ai = getAiClient();
    if (!ai) return { clusters: [] };
    
    // We only need titles and IDs for organization to save tokens, we don't need full content
    const summaryList = nodes.map(n => `ID: ${n.id} | Title: ${n.title} | Type: ${n.type}`).join('\n');

    const prompt = `
    Analyze the following list of items on a canvas. 
    Group them into semantic clusters based on their topic, theme, or content relationship.
    Create a short, punchy 1-3 word title for each cluster.
    Every ID must be assigned to exactly one cluster.
    
    Items:
    ${summaryList}

    Return JSON:
    {
      "clusters": [
        { "title": "Cluster Label", "nodeIds": ["id1", "id2"] }
      ]
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });
        
        return JSON.parse(response.text || '{ "clusters": [] }');
    } catch (e) {
        console.error("Clustering failed", e);
        return { clusters: [] };
    }
};

export const generateChatSuggestions = async (
    history: {role: string, content: string}[], 
    nodes: CanvasNode[]
): Promise<string[]> => {
    const ai = getAiClient();
    if (!ai) return [];

    // Use lightweight flash model for quick suggestions
    const model = "gemini-3-flash-preview";

    // Limit history to last 2 turns to keep it fast and relevant
    const recentHistory = history.slice(-2);
    const historyText = recentHistory.map(h => `${h.role}: ${h.content}`).join('\n');
    
    // We don't send full file content for suggestions to save tokens, just titles/types
    const contextSummary = nodes.map(n => `- ${n.title} (${n.type})`).join('\n');

    const prompt = `
    Based on the conversation history and the list of available sources below, suggest exactly 3 short, relevant follow-up questions the user might want to ask next.
    
    Sources:
    ${contextSummary}

    Conversation:
    ${historyText}

    Return JSON format: { "suggestions": ["Question 1", "Question 2", "Question 3"] }
    Keep questions concise (under 10 words).
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const json = JSON.parse(response.text || "{}");
        return json.suggestions || [];
    } catch (e) {
        console.error("Suggestion Gen Error", e);
        return ["Summarize this", "Key takeaways", "Find connections"];
    }
};

export const summarizeLiveSession = async (transcript: string): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "Error processing transcript.";

    const prompt = `
    You are an intelligent note-taker. 
    Below is a raw transcript from a live voice session. 
    
    Please provide:
    1. A concise **Executive Summary** of the discussion.
    2. Key **Action Items** or takeaways.
    3. A cleaned-up version of the most important quotes or ideas.

    Raw Transcript:
    ${transcript}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        return response.text || "No summary generated.";
    } catch (e: any) {
        return `Error summarizing session: ${e.message}`;
    }
};

export const runStudioTask = async (
  taskType: string, 
  nodes: CanvasNode[],
  modelId: string = GEMINI_RESEARCHER_MODEL,
  options?: any
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Error: API Key missing.";

  let prompt = "";
  let systemInstruction = "You are a helpful AI assistant.";
  let tools: any[] = [];
  let responseMimeType = "text/plain";
  let thinkingBudget = 0;
  
  // Default to the selected model
  let model = modelId;

  // Configuration for Thinking Models (Reasoning)
  if (modelId === 'gemini-3-pro-preview' && (taskType === 'patterns' || taskType === 'critique' || taskType === 'compare' || taskType === 'connect_dots' || taskType === 'research_design' || taskType === 'ethics_review')) {
      thinkingBudget = 4000; // Allocate tokens for reasoning
  }

  const topic = options?.rawInput || "the selected content";

  switch (taskType) {
    // --- CREATOR: PHASE 1 (IDEATION) ---
    case 'idea_validation':
        prompt = `Analyze the following Raw Idea: "${topic}".
        
        Using Google Search, perform a market trend analysis.
        Return a comprehensive "Validation Report" (in clear Markdown) that includes:
        
        1. **Search Trend & Volume**: Is this topic trending? What are people asking? (Qualitative assessment).
        2. **Target Audience Persona**: Who cares about this? What are their pain points?
        3. **3 Viral Hooks**: Three high-converting titles or angles to frame this idea.
        
        Format as clear Markdown using headers and bullet points.`;
        tools = [{googleSearch: {}}];
        systemInstruction = "You are a Viral Trends Analyst. You validate ideas against real-time market data.";
        break;

    case 'trend_analysis':
        prompt = `Analyze current search trends and social media discussions regarding "${topic}".
        Identify rising sub-topics, questions people are asking, and content gaps that I can exploit.
        
        Provide a **Trend Report** with:
        - **Trending Keywords**: 5 key terms.
        - **Public Sentiment**: What are people feeling about this?
        - **Opportunity Gap**: What is no one talking about yet?`;
        tools = [{googleSearch: {}}];
        systemInstruction = "You are a Trend Scout. You find the wave before it breaks.";
        break;

    case 'audience_persona':
        prompt = `Create a detailed **Audience Persona** for content about "${topic}".
        
        Include:
        - **Demographics**: Age, location, occupation.
        - **Psychographics**: Fears, desires, values.
        - **Content Diet**: What else do they watch/read?
        - **The Hook**: What specific emotion will grab their attention?`;
        systemInstruction = "You are a Marketing Psychologist. You understand people deeply.";
        break;

    // --- CREATOR: PHASE 2 (PRE-PRODUCTION) ---
    case 'script_generation':
        const { tone = 'Engaging', platform = 'YouTube' } = options || {};
        prompt = `Act as a professional Scriptwriter.
        
        **Parameters:**
        - **Topic**: ${topic}
        - **Tone**: ${tone}
        - **Platform**: ${platform}
        
        **Deliverables (Output as Markdown):**
        1. **Full Script**: A complete script optimized for retention. Include intro, body, and call-to-action.
        2. **Visual Storyboard**: A bulleted list of visual cues to accompany key parts.`;
        systemInstruction = `You are an expert Content Strategist specializing in ${platform}. Write in a ${tone} voice.`;
        break;

    case 'storyboard':
        prompt = `Create a visual **Storyboard Table** for a video about "${topic}".
        
        Output a Markdown Table with these columns:
        | Scene # | Visual Description | Audio / Dialogue | Est. Duration |
        | :--- | :--- | :--- | :--- |
        
        Ensure the visuals are engaging and the pacing is snappy.`;
        systemInstruction = "You are a Visual Director. You think in images and sequences.";
        break;

    case 'shot_list':
        prompt = `Generate a technical **Shot List** for a high-quality video production about "${topic}".
        
        Output a Markdown Table with these columns:
        | Shot # | Shot Type (Wide/CU/Macro) | Camera Movement | Subject / Action | Lighting Notes |
        | :--- | :--- | :--- | :--- | :--- |
        
        Include diverse angles to keep viewer interest.`;
        systemInstruction = "You are a Cinematographer. You plan the visual language of the film.";
        break;

    case 'visual_synthesis':
        prompt = `Create a structured visual representation of this concept: "${topic}"
        Output a **Mermaid.js** graph definition inside a code block (\`\`\`mermaid ... \`\`\`) representing the flow of ideas.`;
        systemInstruction = "You are a Visual Thinker. You translate abstract text into diagrams.";
        break;

    // --- CREATOR: PHASE 3 (PRODUCTION ASSETS) ---
    case 'viral_hooks':
        prompt = `Generate 10 **Viral Hooks** (Openers) for a video about "${topic}".
        
        Focus on:
        1. Curiosity Gaps
        2. Strong/Controversial Statements
        3. Visual Imagery ("Imagine if...")
        4. Immediate Value ("Here's how to...")
        
        Rank them by predicted retention impact.`;
        systemInstruction = "You are a Copywriting Expert. You know how to stop the scroll.";
        break;

    case 'thumbnail_ideas':
        prompt = `Describe 3 high-CTR **Thumbnail Concepts** for a video about "${topic}".
        
        For EACH concept, strictly define:
        - **Foreground**: Main subject/object.
        - **Background**: Setting/color.
        - **Text Overlay**: Max 3 words (if any).
        - **Facial Expression**: Emotion to convey.
        - **Psychological Trigger**: Why would they click?`;
        systemInstruction = "You are a YouTube Strategist. You optimize for Click-Through Rate.";
        break;

    case 'caption_writing':
        prompt = `Write SEO-optimized **Captions & Descriptions** for "${topic}".
        
        Provide versions for:
        1. **YouTube Description**: First 2 lines (hook), detailed summary, chapters, keywords.
        2. **Instagram/TikTok Caption**: Punchy hook, value prop, engagement question, hashtags.
        3. **LinkedIn Post**: Professional hook, "Broetry" spacing, clear takeaway.`;
        systemInstruction = "You are a Social Media Manager. You maximize reach and SEO.";
        break;

    // --- CREATOR: PHASE 4 (DISTRIBUTION) ---
    case 'repurpose_content':
        prompt = `Repurpose the concept "${topic}" into a Multi-Channel Content Package.
        
        **Deliverables (Output as distinct Markdown sections):**
        ## 1. X (Twitter) Thread (5 tweets)
        ## 2. LinkedIn Article (Professional tone)
        ## 3. TikTok/Shorts Script (60s max)
        
        Ensure native formatting for each platform.`;
        systemInstruction = "You are a Master Content Repurposer. You adapt one core message everywhere.";
        break;

    case 'social_calendar':
        prompt = `Create a **1-Week Social Media Content Calendar** to promote "${topic}".
        
        Output a Markdown Table:
        | Day | Platform | Content Idea | Format (Video/Text/Image) | Goal (Reach/Engagement) |
        | :--- | :--- | :--- | :--- | :--- |
        
        Balance hype, value, and community engagement.`;
        systemInstruction = "You are a Campaign Manager. You plan strategic rollouts.";
        break;

    case 'email_draft':
        prompt = `Write an engaging **Email Newsletter** to subscribers sharing the key insights from "${topic}".
        
        Structure:
        - **Subject Line**: High open rate.
        - **Personal Opener**: Connect with the reader.
        - **The Core Value**: What did we learn?
        - **Call to Action**: Watch the video / Read more.
        
        Keep it personal and valuable.`;
        systemInstruction = "You are a Newsletter Writer. You build community through email.";
        break;

    // --- NEW PLANNING & DOCS TOOLS ---
    case 'mindmap':
        prompt = `Analyze the provided sources/ideas and create a hierarchical Mindmap.
        
        OUTPUT FORMAT:
        Use **Mermaid.js** syntax inside a code block (\`\`\`mermaid ... \`\`\`).
        Use a 'mindmap' diagram type.
        
        Example:
        \`\`\`mermaid
        mindmap
          root((Main Topic))
            Branch 1
              Child A
              Child B
            Branch 2
        \`\`\`
        
        If the topic is abstract, structure it logically. Keep node text short.`;
        systemInstruction = "You are a Systems Thinker. You visualize complex information hierarchies.";
        break;

    case 'planning':
        prompt = `Create a comprehensive **Project Plan** based on the provided context.
        
        Include:
        1. **Executive Summary**: 2-sentence overview.
        2. **Phases & Timeline**: Broken down by week/milestone.
        3. **Key Tasks**: A checklist of actionable items.
        4. **Resources Needed**: Tools, people, or assets.
        
        Format as clear Markdown with checkboxes for tasks (e.g., - [ ] Task).`;
        systemInstruction = "You are a Senior Project Manager. You turn ideas into actionable plans.";
        break;

    case 'documentation':
        prompt = `Generate professional **Documentation** for the attached material.
        
        If code/technical: Create a Technical Spec (Overview, Architecture, API, Setup).
        If creative/product: Create a PRD (Product Requirement Doc) or Concept Overview.
        
        Use standard industry structure (Introduction, Goals, Specifications, Risks).
        Format with clear Markdown headers and tables where appropriate.`;
        systemInstruction = "You are a Technical Writer. You create clear, structured, and professional documentation.";
        break;

    // --- RESEARCHER & GENERAL TASKS ---
    case 'research_design':
      prompt = `Act as a Senior Research Methodologist. Based on the attached materials and topics, formulate a robust Research Design. 
      Include: 
      1. Research Question(s) & Hypothesis. 
      2. Methodology (Qualitative/Quantitative/Mixed). 
      3. Data Collection Strategy. 
      4. Variables/Measures.
      5. Procedure.`;
      systemInstruction = "You are an expert Research Methodologist. Focus on validity, reliability, and feasibility.";
      break;
    case 'literature_review':
      prompt = `Act as an Academic Researcher. Conduct a synthesis of the attached sources to create a Literature Review. 
      Structure it by: 
      1. Key Themes & Concepts. 
      2. Current State of Knowledge. 
      3. Identified Gaps in Literature. 
      4. How this project fits in.`;
      break;
    case 'data_analysis':
      prompt = `Act as a Data Scientist and Qualitative Analyst. Analyze the attached evidence/data. 
      1. Interpret key findings. 
      2. Identify patterns and correlations. 
      3. Assess the quality of the evidence. 
      4. Suggest further data collection needs.`;
      break;
    case 'ethics_review':
      prompt = `Act as an IRB (Institutional Review Board) Ethics Committee member. Review the provided research context for ethical compliance. 
      Identify: 
      1. Potential Risks to participants/data. 
      2. Consent and Privacy concerns. 
      3. Bias and Fairness issues. 
      4. Mitigation strategies.`;
      systemInstruction = "You are an Ethics Review Board member. Be critical, protective, and adhere to standard ethical guidelines.";
      break;
    case 'dissemination_plan':
      prompt = `Act as a Research Communication Specialist. Create a Dissemination Strategy for this project. 
      Provide: 
      1. Target Audiences (Academic vs Public). 
      2. An Academic Abstract (300 words). 
      3. A Public Engagement Plan (Blog/Social media angle). 
      4. Potential Journals or Conferences.`;
      break;
    case 'podcast':
      prompt = `Generate a transcript for a 5-minute "Audio Overview" podcast where two hosts (Host A and Host B) discuss the key points from these attached sources in an engaging, conversational way.`;
      systemInstruction = "You are a podcast script writer. Write in a conversational dialogue format.";
      break;
    case 'quiz':
      prompt = `Create a 5-question multiple choice quiz based on the information in these attached sources. Include the correct answer key at the bottom.`;
      break;
    case 'brainstorm':
      prompt = `Act as a creative director. Generate 3 distinct, divergent creative concepts based on these sources.
      For EACH concept, branch out into 2-3 specific narrative beats or execution details that expand on the concept.
      
      Return ONLY a raw JSON object (no markdown formatting) with this nested structure:
      {
        "concepts": [
          { 
             "title": "Creative Concept 1", 
             "description": "High level description of the idea.",
             "children": [
                { "title": "Narrative Branch A", "description": "Specific story beat or detail." },
                { "title": "Narrative Branch B", "description": "Specific story beat or detail." }
             ]
          }
        ]
      }`;
      responseMimeType = "application/json";
      break;
    case 'patterns':
      prompt = `Act as a master detective and data scientist. Analyze the attached files to find:
      1. Hidden connections between seemingly unrelated points.
      2. Contradictions or gaps in the data.
      3. Deduce 3 logical conclusions that are not explicitly stated.
      Format the output as a structured investigation report.`;
      systemInstruction = "You are a rigorous analytical engine. Focus on logic, deduction, and evidence.";
      break;
    case 'connect_dots':
      prompt = `Analyze the selected disparate sources (Notes, Documents, Ideas).
      Your goal is to "Connect the Dots" and find the hidden narrative, logical path, or thematic thread that links them all together.
      
      Output a structured "Connectivity Report":
      
      ## 1. The Golden Thread
      [Describe the central theme or hidden link that unifies these items]

      ## 2. The Logical Path
      [Create a step-by-step journey showing how one idea leads to the next. Use format: Item A -> Item B because...]

      ## 3. Unified Synthesis
      [Write a cohesive 3-paragraph narrative that weaves all these insights into a single strong argument or story.]`;
      systemInstruction = "You are a Master Synthesizer. You find order in chaos and connections where others see none.";
      break;
    case 'briefing':
      prompt = `Create a "Briefing Doc" that summarizes the most critical information from these files for a high-level executive.`;
      break;
    case 'faq':
      prompt = `Generate a list of 10 Frequently Asked Questions (FAQ) that someone studying this material might ask, with answers based on the files.`;
      break;
    case 'timeline':
      prompt = `Extract a chronological timeline of all events, dates, and milestones mentioned in these files.`;
      break;
    case 'compare':
      prompt = `Create a detailed Comparative Analysis Matrix (in Markdown Table format) of the attached sources.
      
      The table columns should include:
      1. Source Name
      2. Key Hypothesis/Argument
      3. Methodology/Approach
      4. Key Evidence/Data
      5. Limitations/Gaps
      
      If a source does not fit a column, mark it as N/A. After the table, provide a bulleted synthesis of the major similarities and differences.`;
      systemInstruction = "You are a Comparative Literature Analyst. You synthesize multiple sources into structured data.";
      break;
    case 'critique':
      prompt = `Act as "Reviewer #2" for an academic journal. Ruthlessly critique the attached content.
      Identify:
      1. Logical fallacies or weak arguments.
      2. Missing evidence or citations.
      3. Structural issues.
      4. Potential bias.
      
      Be constructive but very critical.`;
      systemInstruction = "You are a critical Academic Peer Reviewer. Your job is to find flaws and suggest improvements.";
      break;
    case 'web_research':
      prompt = `Analyze the provided sources to identify core topics. Then perform a deep web search to find latest updates, news, or missing perspectives related to these files. Produce a "Web Context" report.`;
      tools = [{googleSearch: {}}];
      break;
  }

  const parts = buildContentParts(nodes, prompt);

  const config: any = { 
    systemInstruction,
    tools,
    responseMimeType
  };

  // Add Thinking Config if budget is set
  if (thinkingBudget > 0) {
      config.thinkingConfig = { thinkingBudget };
      // Note: When using thinkingConfig, we often need to ensure maxOutputTokens is set if required, 
      // but the SDK handles default well. We won't restrict maxOutputTokens unnecessarily.
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts }],
      config
    });
    
    let text = response.text || "No content generated.";
    if (taskType !== 'brainstorm') {
        text += formatGroundingMetadata(response.candidates?.[0]);
    }
    return text;
  } catch (error) {
    throw error; // Throw to be caught by UI
  }
}

export const askChat = async (
  history: {role: string, content: string}[], 
  newMessage: string, 
  mode: AppMode, 
  nodes: CanvasNode[],
  modelId: string,
  allSessions: ChatSession[] = [],
  currentSessionId: string = '',
  isDeepResearch: boolean = false
): Promise<string> => {
   const ai = getAiClient();
   if (!ai) return "Error: API Key missing.";
   
   // 1. Construct current history text
   const previousHistory = history.filter((_, i) => i !== history.length - 1 || _.content !== newMessage);
   const historyText = previousHistory.map(h => `${h.role}: ${h.content}`).join('\n');
   
   // 2. Logic to detect if user wants older chats
   const isRequestingHistory = /previous chat|older chat|past conversation|history|other session|earlier chat|last time/i.test(newMessage);
   
   let extraContext = "";
   if (isRequestingHistory && allSessions.length > 1) {
       const archives = formatArchivedSessions(allSessions, currentSessionId);
       extraContext = `
       \n[SYSTEM NOTICE: The user has explicitly requested information from previous independent sessions. The following data is from ARCHIVED chats. Do not confuse this with the current session context unless relevant to the user's question.]
       \n${archives}
       \n[END OF ARCHIVED DATA]
       `;
   }

   const promptText = `
     Current Chat Session History:
     ${historyText}
     
     ${extraContext}

     User Question: ${newMessage}
     
     Answer the user's question based on the attached files/sources (if any) and the Current Chat Session History above. 
     Treat the current session as an isolated conversation. 
     Only refer to the [ARCHIVED DATA] if the user explicitly asked about previous chats or history.
   `;

   const parts = buildContentParts(nodes, promptText);

   const isCreator = mode === AppMode.CREATOR;
   
   // TOOLS CONFIGURATION
   // We only enable Google Search in Researcher Mode
   const tools = (!isCreator && mode === AppMode.RESEARCHER) ? [{googleSearch: {}}] : [];

   // SYSTEM INSTRUCTION GENERATION
   let systemInstruction = "";

   if (isCreator) {
      // UPDATED: Creator Persona now returns Markdown, not JSON
      systemInstruction = `You are a Creative Collaborator and Strategic Partner.
         For every user request, provide distinct 'Creative Concepts' or 'Angles'.
         Use bold headers and bullet points. Be punchy, inspiring, and direct.
         Do NOT return JSON. Use clear Markdown formatting.`;
   } else {
      // RESEARCHER MODE LOGIC
      if (isDeepResearch) {
         systemInstruction = `You are an Advanced Research Agent in "Deep Research Mode".
         
         For EVERY user query, you MUST perform a rigorous, multi-step investigation:
         
         1. **Canvas Analysis**: First, thoroughly analyze the provided "Source" files and text in the prompt.
         2. **Deep Web Search**: Use the Google Search tool to find comprehensive, latest, and diverse external information. Do not settle for surface-level answers. Look for primary sources and contradictions.
         3. **Cross-Verification**: Compare the Canvas data with the Web data. Explicitly check for facts, dates, and claims.
         
         Your Output Format MUST use these headers:
         ## 1. Internal Analysis (Canvas)
         [Your findings from the uploaded files]
         
         ## 2. External Intelligence (Web)
         [Your findings from the web search]
         
         ## 3. Verified Synthesis
         [Your final answer, highlighting any contradictions between the files and the web, and providing a unified conclusion.]
         `;
      } else {
          // Standard Research Mode (Fast but structured)
          systemInstruction = `You are a helpful Research Assistant. 
          For every query, you must perform these 3 specific processes:
          1. **Canvas Search**: Analyze the attached files.
          2. **Web Search**: Use the Google Search tool to augment information.
          3. **Verification**: Verify the Canvas info against the Web info.
          4. **Citation**: Always attribute claims to the specific [Source: Title].

          Explicitly mention if the web search confirms or contradicts the internal files.
          `;
      }
   }

   const responseMimeType = "text/plain"; // Always plain text/markdown for chat now

   try {
     const response = await ai.models.generateContent({
       model: modelId,
       contents: [{ role: 'user', parts }],
       config: {
         systemInstruction,
         tools,
         responseMimeType
       }
     });
     
     let text = response.text || "No response.";
     // Only add grounding for researcher/text mode
     if (!isCreator) {
        text += formatGroundingMetadata(response.candidates?.[0]);
     }
     return text;
   } catch (error) {
     return "Error in chat: " + error;
   }
};
