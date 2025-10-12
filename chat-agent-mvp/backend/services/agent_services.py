# services/agent_service.py

# --- 必要なライブラリ (変更なし) ---
import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import Literal
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate # MessagesPlaceholderは不要になる
from langchain.output_parsers import PydanticOutputParser
# HumanMessage, AIMessageも不要になる

load_dotenv()

# --- データ形式の定義 (変更なし) ---
class AgentResponse(BaseModel):
    next_action: Literal["continue", "propose_end"] = Field(...)
    response_text: str = Field(...)

# --- ★★★ プロンプトを修正 ★★★ ---
# LLMに会話ログの形式を理解させるための指示を追加
SYSTEM_PROMPT = """
あなたは、ユーザーが一日を振り返り、気軽に日記を書くのを手伝う、共感的で聞き上手な対話アシスタントです。
あなたの目的は、ユーザーとの自然な会話の中から、日記の材料となる5つの項目「具体的な出来事」「その時の感情や考え」「気づきや学び」「感謝や良かったこと」「明日やりたいこと」を優しく引き出すことです。
以下の会話ログの文脈を読み取り、あなたの次の応答を生成してください。会話ログは`[USER]`と`[ASSISTANT]`のプレフィックスで構成されています。

# あなたの振る舞い (ルール):
- 常にユーザーの発言を肯定し、共感の言葉を一言入れてください。(例: 「そうだったんですね！」「それは大変でしたね。」)
- 質問は一度に一つだけにしてください。
- ユーザーの話した内容を深掘りする質問をしてください。(5W1H: いつ、どこで、誰が、何を、なぜ、どのように)
- 日記に必要な5つの情報のうち、まだ聞けていない項目を埋めるための質問をしてください。

# 日記の作成に必要な情報:
- 今日の出来事
- 今日の気持ち
- 気づき・学び
- 感謝したこと・よかったこと
- 明日への一言・やりたいこと

# 行動判断の基準:
以下の条件を総合的に判断し、次の行動を決定してください。
1. **対話を続ける場合 (`continue`):**
   - 上記の「日記の作成に必要な情報」のうち、まだ十分に聞けていない項目がある。
2. **終了を提案する場合 (`propose_end`):**
   - 上記の「日記の作成に必要な情報」が、ある程度まんべんなく語られた。
   - 会話のラリーが5回以上続き、話がある程度出尽くした感がある。
   - ユーザーが「それくらいかな」のように、話を終えたがっている様子を見せた。

# 出力形式の指示:
{format_instructions}
"""

# --- LangChainコンポーネント (変更なし) ---
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0, api_key=os.getenv("GOOGLE_API_KEY"))
parser = PydanticOutputParser(pydantic_object=AgentResponse)

# --- ★★★ プロンプトテンプレートを修正 ★★★ ---
# 構造化されたメッセージの代わりに、単一のテキスト(history_text)を受け取るように変更
prompt_template_str = SYSTEM_PROMPT + "\n\n# 会話ログ\n{history_text}"
prompt = ChatPromptTemplate.from_template(
    template=prompt_template_str
).partial(format_instructions=parser.get_format_instructions())

# --- チェーンを組み立て (変更なし) ---
agent_chain = prompt | llm | parser

# --- ★★★ メイン関数をシンプルに修正 ★★★ ---
def invoke_agent(history_text: str) -> AgentResponse:
    """
    テキスト形式の会話履歴をそのままLLMに渡してエージェントを呼び出す関数。
    """
    # 解析処理をなくし、テキストを直接チェーンに渡す
    response_obj = agent_chain.invoke({"history_text": history_text})
    return response_obj