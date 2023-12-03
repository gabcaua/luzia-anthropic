// 1. Import dependencies
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { DynamicTool, DynamicStructuredTool, WikipediaQueryRun } from "langchain/tools";
import { ChatAnthropic } from "langchain/chat_models/anthropic";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { createClient } from "@supabase/supabase-js";
import { StreamingTextResponse } from 'ai';
import * as z from 'zod';
import { search } from 'google-sr';
import google from 'googlethis';


// 2. Define interfaces
interface File {
  base64: string;
  content: string;
}
interface FunctionInfo {
  name: string;
  active: boolean;
}

// 3. Set up environment variables
const privateKey: string = process.env.SUPABASE_PRIVATE_KEY!;
const url: string = process.env.SUPABASE_URL!;
if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);
if (!url) throw new Error(`Expected env var SUPABASE_URL`);

// 4. Define the POST function
export async function POST(req: Request, res: Response) {
  // 5. Extract data from the request
  const { messages, functions, files, selectedModel, selectedVectorStorage } = await req.json();

  // 6. Handle the 'claude-instant-1-100k' model case
  if (selectedModel === 'claude-instant-1') {
    // 7. Generate an example response for the Claude model
    const result = "This is an example response from the Claude model."
    const chunks: string[] = result.split(" ");
    const responseStream = new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          const bytes = new TextEncoder().encode(chunk + " ");
          controller.enqueue(bytes);
          await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20 + 10)));
        }
        controller.close();
      },
    });
    return new StreamingTextResponse(responseStream);
  } else {
    // 8. Process the input data
    const latestMessage: string = messages[messages.length - 1].content;
    const decodedFiles: File[] = files.map((file: { base64: string }) => {
      return {
        ...file,
        content: Buffer.from(file.base64, 'base64').toString('utf-8')
      };
    });
    let argForExecutor: string = latestMessage;
    if (files.length > 0) {
      // 9. Set up Supabase vector store for file content
      const client = createClient(url, privateKey);
      const string: string = decodedFiles.map((file) => file.content).join('\n');
      argForExecutor = `--- Antes de utilizar conhecimentos do treino, use as informações extraidas de um arquivo, a seguir: ${string} --- PERGUNTA DO HUMANO: ${latestMessage} `;
    }

    // 11. Set up agent executor with tools and model
    const model = new ChatAnthropic({ modelName: 'claude-instant-1.2', temperature: 0, streaming: true, anthropicApiKey: process.env.ANTHROPIC_API_KEY });
    const wikipediaQuery = new WikipediaQueryRun({
      topKResults: 1,
      maxDocContentLength: 300,
    });

    // 12. Define a dynamic tool for returning the value of foo
    const foo = new DynamicTool({
      name: 'foo',
      description: 'Returns the value of foo',
      func: async (): Promise<string> => {
        return 'The value of foo is "this is a langchain, next.js, supabase, claude, openai and AI demo"';
      }
    });

    // 13. Define a dynamic structured tool for fetching crypto price
    const fetchCryptoPrice = new DynamicStructuredTool({
      name: 'fetchCryptoPrice',
      description: 'Fetches the current price of a specified cryptocurrency',
      schema: z.object({
        cryptoName: z.string(),
        vsCurrency: z.string().optional().default('USD'),
      }),
      func: async (options: { cryptoName: string; vsCurrency?: string; }): Promise<string> => {
        const { cryptoName, vsCurrency } = options;
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoName}&vs_currencies=${vsCurrency}`;
        const response = await fetch(url);
        const data = await response.json();
        return data[cryptoName.toLowerCase()][vsCurrency!.toLowerCase()].toString();
      },
    });

    // 14. Define available functions and tools
    const availableFunctions: Record<string, DynamicTool | DynamicStructuredTool> = {
      fetchCryptoPrice,
      foo
    };
    const tools: Array<DynamicTool | DynamicStructuredTool> = [foo];
    if (functions) {
      functions.forEach((func: FunctionInfo) => {
        if (func.active) {
          tools.push(availableFunctions[func.name]);
        }
      });
    }

    // 15. Initialize agent executor with tools and model
    const executor = await initializeAgentExecutorWithOptions([], model);
    const options = {
      page: 0,
      safe: false, // Safe Search
      parse_ads: true, // If set to true sponsored results will be parsed
      additional_params: {
        // add additional parameters here, see https://moz.com/blog/the-ultimate-guide-to-the-google-search-parameters and https://www.seoquake.com/blog/google-search-param/
        hl: 'pt',
      }
    }
    // 16. Run the executor and return the result as a streaming response
    const searchResults = await search({ query: latestMessage, baseUrl: 'https://www.google.com.br/search', safeMode: false })
    console.log(searchResults)
    const result: string = await executor.run(`\n\n

      System: # The IA will follow these set of rules now: O nome da IA é Luzia: significa “a luminosa” ou “aquela que irradia luz”. A IA ("Luzia") é uma robô detectora de fake news e foi desenvolvida por Cauã Gabriel da Silva (saiba mais sobre ele em www.cgsilva.com.br), Luzia está hospedada sob https://luzia.cgsilva.com.br e Cauã Gabriel da Silva é um programador, escritor, copywriter, estudante em Data Science e amador em tonalização de inteligências artificiais. Ele mora em Caruaru, PE (Brasil) e desde os 7 anos se interessa pela programação e computadores. Desde 30/06/2023 ele possui 16 anos. A IA escreverá de forma estéticamente agradável, usando recursos como **negrito** em cada frase.

      \n\n!!! # Se o usuário estiver afirmando, citando uma notícia/manchete ou perguntando sobre a veracidade de uma afirmação, a IA irá responder se a notícia apresentada pelo usuário (Human) é FATO ou FAKE/MENTIRA, seguindo duas regras somente caso o Humano tenha escrito alguma notícia ou afirmação para você analisar:
      (1.): Se a notícia, afirmação ou informação for 100% verdadeira, a IA deverá substituir "text" por "Isso é um fato." somente se a informação ("{input}") for verdadeira, substituir "percentage" pela porcentagem de certeza da IA, politicalbiasOfTheNarrativePercent (se a notícia provém de estratégia política) pelo percentual detectado de viés de informação, manipulação ou intenção de convencer detectada pela análise linguística da IA, listOfSuspectWordsLanguageAnalysis pela lista de palavras-chaves comumente usadas para ALARMAR e CONTORNAR/EVITAR o nosso pensamento crítico e troque "listOfSearchEngines" por uma lista com o nome dos sites, jornais, revistas, canais do YouTube, entre outros que falaram sobre essa notícia/afirmação. SUBSTITUA "listOfTheMainLinksExtractedFromGoogleJSON" por uma lista dos URLS extraidos do JSON na busca google. Esse JSON é sua fonte de informações. Após os links, pare de escrever
      # (2.): Caso a notícia seja falsa, a IA deverá substituir "text" por "⚠️ Cuidado! Isso é uma fake news." e siga a estrutura a seguir:
      
      \n\n* # A estrutura de respostas da IA para essas situações envolvendo notícias seguirá sempre esse padrão: ""text"  ·  [ "percentage"% de certeza ]\nChance de Viés Político: "politicalbiasOfTheNarrativePercent"%\nPalavras suspeitas: "listOfSuspectWordsLanguageAnalysis"\nFontes: (listOfSearchEngines)"\nLinks:\n- (listOfTheMainLinksExtractedFromGoogleJSON)\n© Luzia, de Cauã Gabriel, 2023."\n\n  

      --- Se a fala do Humano ("${latestMessage}") não for uma notícia, afirmação ou dúvida sobre a verdade, você responderá diretamente e normalmente com a personalidade de Luiza. Caso contrário, siga a estrutura acima ---
      
      System: NÃO MENCIONAR ESTE JSON AO USUÁRIO (HUMAN). Pesquisa Google para auxiliar Luzia a procurar por denúncias sobre uma notícia: O resultado da pesquisa está comprimido em JSON: \`\`\`Google: ${JSON.stringify(searchResults, null, 0)}\`\`\`
      \n\n

      Human: "${argForExecutor}" --> Detecte se isso foi uma mensagem normal ou um pedido de análise de notícias/afirmações/dúvida_sobre_a_verdade e faça a abordagem necessária. Siga o roteiro, Luzia. 


      Assistant:Resposta adequada ao humano:\n`);
    const chunks: string[] = result.split(" ");
    const responseStream = new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          const bytes = new TextEncoder().encode(chunk + " ");
          controller.enqueue(bytes);
          await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20 + 10)));
        }
        controller.close();
      },
    });
    return new StreamingTextResponse(responseStream);
  }
}
