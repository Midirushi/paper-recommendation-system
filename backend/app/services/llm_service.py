import json
from typing import List, Dict, Any
from openai import OpenAI
from anthropic import Anthropic
from ..config import settings
import tiktoken

class LLMService:
    def __init__(self):
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.LLM_MODEL
        self.encoder = tiktoken.encoding_for_model("gpt-4")
    
    def extract_keywords(self, user_query: str) -> Dict[str, Any]:
        """Extract structured keywords from user query"""
        prompt = f"""分析以下用户查询，提取检索所需的结构化信息：
用户查询："{user_query}"

请提取：
1. 核心研究主题（主关键词，中英文）
2. 相关领域概念（扩展关键词）
3. 可能的英文对应术语
4. 时间范围偏好（如recent_5_years、recent_3_years或all_time）
5. 文献类型偏好（research_article、review、conference_paper等）

严格以JSON格式输出，不要包含任何其他文字：
{{
  "core_keywords_zh": ["关键词1", "关键词2"],
  "core_keywords_en": ["keyword1", "keyword2"],
  "extended_keywords": ["扩展词1", "扩展词2"],
  "time_range": "recent_5_years",
  "preferred_types": ["research_article", "review"]
}}"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "你是一个专业的学术检索助手，擅长理解用户需求并提取关键信息。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
        except Exception as e:
            print(f"Error extracting keywords: {e}")
            # Fallback: simple keyword extraction
            return {
                "core_keywords_zh": [user_query],
                "core_keywords_en": [],
                "extended_keywords": [],
                "time_range": "recent_5_years",
                "preferred_types": ["research_article"]
            }
    
    def filter_papers(self, user_query: str, papers: List[Dict], top_k: int = 20) -> List[Dict]:
        """Use LLM to filter and rank papers by relevance"""
        if not papers:
            return []
        
        # Prepare paper summaries for LLM
        paper_summaries = []
        for idx, paper in enumerate(papers[:50]):  # Limit to first 50 to avoid token limits
            summary = f"""[论文{idx+1}]
标题：{paper.get('title', 'N/A')}
摘要：{paper.get('abstract', 'N/A')[:300]}...
关键词：{', '.join(paper.get('keywords', [])[:10])}
作者：{', '.join([a.get('name', '') for a in paper.get('authors', [])[:3]])}
期刊：{paper.get('journal', 'N/A')}
发表时间：{paper.get('publish_date', 'N/A')}
引用数：{paper.get('citation_count', 0)}
"""
            paper_summaries.append(summary)
        
        papers_text = "\n\n".join(paper_summaries)
        
        prompt = f"""你是一位资深学术研究助手。用户需求："{user_query}"

以下是检索到的论文列表：
{papers_text}

任务：
1. 评估每篇论文与用户需求的相关度（0-10分，保留一位小数）
2. 识别高质量信号（顶刊、高引用、权威机构）
3. 按相关度排序并给出推荐理由（每篇不超过50字）
4. 只保留相关度>=6.0的论文

严格输出JSON格式：
{{
  "recommended_papers": [
    {{
      "paper_index": 1,
      "relevance_score": 9.5,
      "reason": "该论文直接针对地理知识图谱构建..."
    }}
  ],
  "total_evaluated": 50,
  "total_recommended": 15
}}"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "你是一个专业的学术文献评估专家。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Merge recommendations with original papers
            filtered_papers = []
            for rec in result.get('recommended_papers', [])[:top_k]:
                paper_idx = rec['paper_index'] - 1
                if 0 <= paper_idx < len(papers):
                    paper = papers[paper_idx].copy()
                    paper['relevance_score'] = rec['relevance_score']
                    paper['recommendation_reason'] = rec['reason']
                    filtered_papers.append(paper)
            
            return filtered_papers
        
        except Exception as e:
            print(f"Error filtering papers: {e}")
            # Fallback: return top papers by citation
            return sorted(papers, key=lambda x: x.get('citation_count', 0), reverse=True)[:top_k]
    
    def analyze_trends(self, papers: List[Dict], period: str = "week") -> Dict:
        """Analyze research trends from recent papers"""
        if not papers:
            return {"topics": [], "summary": "暂无数据"}
        
        # Prepare paper data
        paper_data = []
        for paper in papers[:100]:
            data = f"""- {paper.get('title', '')} ({paper.get('journal', '')}, {paper.get('publish_date', '')})
  关键词: {', '.join(paper.get('keywords', [])[:5])}"""
            paper_data.append(data)
        
        papers_text = "\n".join(paper_data)
        
        prompt = f"""分析以下本{period}新发表的论文，识别研究热点和前沿动态：

{papers_text}

任务：
1. 识别3-5个主要研究热点主题
2. 每个热点归纳核心研究问题和技术趋势
3. 指出方法论创新和应用突破
4. 给出整体趋势总结（200字内）

输出JSON格式：
{{
  "topics": [
    {{
      "name": "多模态地理知识融合",
      "description": "整合文本、图像、时空数据...",
      "paper_count": 12,
      "hot_papers": ["paper_id1", "paper_id2"]
    }}
  ],
  "summary": "本周地理知识图谱研究呈现...",
  "insights": ["洞察1", "洞察2"]
}}"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "你是一个学术趋势分析专家。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,
                response_format={"type": "json_object"}
            )
            
            return json.loads(response.choices[0].message.content)
        
        except Exception as e:
            print(f"Error analyzing trends: {e}")
            return {"topics": [], "summary": "分析失败"}
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate text embedding for semantic search"""
        try:
            response = self.openai_client.embeddings.create(
                model=settings.EMBEDDING_MODEL,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return [0.0] * settings.VECTOR_DIMENSION

llm_service = LLMService()