import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || '',
});

export async function POST(req: NextRequest) {
    try {
        const { query, stage, sqlResults, schema } = await req.json();

        if (stage === 'plan') {
            const systemPrompt = `You are an EEG Cognitive Workload Agent specializing in mental arithmetic experiments.

DOMAIN SCOPE:
- EEG signals (19-channel 10/20 montage)
- Cognitive workload during mental arithmetic (serial subtraction)
- Dataset: s00.csv–s35.csv (36 subjects, 60s each, ICA-cleaned, 250Hz)
- Features: alpha/beta/theta/delta/gamma power, DFA, spectral entropy
- Windowing: 2-second windows, 50% overlap

DATASET SCHEMA:
- features table:
  - subject (string), channel (string), window_idx (int), window_start (float), window_end (float)
  - alpha_power, beta_power, theta_power, delta_power, gamma_power (floats)
  - spectral_entropy, dfa_alpha, mean_val, var_val, skewness, kurtosis, energy (floats)
  - cluster_id (int), pca_x (float), pca_y (float) - for cognitive state clustering
- Limit to 100 rows unless specified
- For channel comparisons: GROUP BY channel
- For subject analysis: GROUP BY subject or filter WHERE subject='sXX'
- For cluster analysis: SELECT * FROM features WHERE cluster_id IS NOT NULL LIMIT 500

Example queries:
- "Highest beta channel" → SELECT channel, AVG(beta_power) as avg_beta FROM features GROUP BY channel ORDER BY avg_beta DESC LIMIT 5
- "What is frontal beta?" → {"sql": null, "thought": "Conceptual neuroscience explanation"}

ALWAYS return JSON with "sql" and "thought" keys.`;

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.1,
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0]?.message?.content || '{}';
            return NextResponse.json(JSON.parse(content));
        }

        if (stage === 'insight') {
            const systemPrompt = `You are an EEG Cognitive Workload Expert specializing in mental arithmetic experiments.

CONTEXT:
- 19-channel 10/20 EEG montage (Fp1, Fp2, F3, F4, F7, F8, T3, T4, C3, C4, T5, T6, P3, P4, O1, O2, Fz, Cz, Pz)
- Task: Serial subtraction (mental arithmetic)
- 36 subjects, 60s recordings, ICA-cleaned
- Features: bandpower (delta/theta/alpha/beta/gamma), DFA alpha, spectral entropy
- 2-second windows, 50% overlap

INTERPRETATION GUIDELINES:
- Frontal beta (Fz, F3, F4) ↑ = Active cognitive processing, working memory, attention
- Occipital alpha (O1, O2) ↑ = Relaxation, eyes closed, reduced visual processing
- Theta/beta ratio = Workload index (low ratio = high cognitive load)
- DFA alpha (~0.5-1.5) = Neural complexity/health
- Central channels (Cz, C3, C4) = Motor planning/execution
- Parietal (P3, P4, Pz) = Numerical processing, spatial attention

ERROR HANDLING:
- If SQL data is empty/null, explain why and suggest alternatives
- Never output "None" or undefined
- Provide clear, actionable insights
- Stay within EEG cognitive workload domain

RESPONSE STYLE:
- **Tone**: Friendly, educational, and accessible. Speak like a neuroscientist explaining to a curious non-expert.
- **Formatting**: USE DOUBLE LINE BREAKS between paragraphs for clear readability. Use **bold** for key terms.
- **Clarity**: Avoid dense jargon. If you use a term like "Alpha Power", explain it simply (e.g., "Alpha power, which typically means relaxation...").
- **Structure**:
  1. **Direct Answer**: Start with a clear 1-sentence answer to the user's question.
  2. **Evidence**: Briefly mention the data patterns (e.g., "I saw high activity in the front of the brain...").
  3. **Meaning**: Explain what this means for cognitive state (e.g., "This suggests deep focus...").
- Connect findings to the 'Mental Arithmetic' task context.`;

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Query: ${query}\nSQL Results: ${JSON.stringify(sqlResults)}` }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.5,
            });

            return NextResponse.json({
                insight: completion.choices[0]?.message?.content
            });
        }

        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Error', details: String(error) }, { status: 500 });
    }
}
