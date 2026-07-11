# ─────────────────────────────────────────────────────────────────────────────
# HorizonView — Podcast Update Notebook (Executive tier)
# Runs in Microsoft Fabric. Triggered by the portal (`POST /api/podcast`)
# or on a weekly schedule.
#
# Flow: Intelligence Layer → Podcastfy → MP3 + transcript → SharePoint →
#       PodcastURL written back to the Intelligence Layer.
#
# Cost note: TTS is the only per-run cost (~$0.10–$0.50 per 5-min episode with
# OpenAI TTS; ElevenLabs higher quality/cost; edge-tts free for internal demos).
# Podcastfy itself is open source (https://github.com/souzatharsis/podcastfy).
#
# Fabric environment: add `podcastfy` and `ffmpeg` to the environment's
# custom libraries, and store API keys in Azure Key Vault (not in code).
# ─────────────────────────────────────────────────────────────────────────────

from podcastfy.client import generate_podcast

# 1. Read the latest AI insights for the project from the Intelligence Layer
project_id = "alpha"  # parameterize via notebook params when triggered by the portal
df = spark.sql(f"""
    SELECT ProjectName, ExecutiveSummary, RiskNarrative, RecommendedAction,
           WeeklyChangeSummary, DecisionNeeded, HealthScore, ForecastCompletionDate
    FROM HorizonView.IntelligenceLayer
    WHERE ProjectId = '{project_id}'
""").collect()[0]

briefing_text = f"""
Project update for {df.ProjectName}.
Executive summary: {df.ExecutiveSummary}
Risk narrative: {df.RiskNarrative}
Recommended actions: {df.RecommendedAction}
This week's changes: {df.WeeklyChangeSummary}
{"Decision needed: " + df.DecisionNeeded if df.DecisionNeeded else ""}
"""

# 2. Render a two-host conversational episode with Podcastfy
audio_path = generate_podcast(
    text=briefing_text,
    conversation_config={
        "word_count": 800,  # ~5 minutes
        "podcast_name": "HorizonView Executive Briefing",
        "podcast_tagline": f"The weekly update on {df.ProjectName}",
        "conversation_style": ["concise", "analytical", "executive"],
        "creativity": 0.3,  # stay close to the grounded facts
    },
    tts_model="openai",  # or "elevenlabs" / "edge" (free)
)

# 3. Publish MP3 + transcript to the project's SharePoint site via Graph
#    (upload to the Documents library, folder "Podcast Briefings")
sharepoint_url = upload_to_sharepoint(audio_path, project_id)  # implement with Graph SDK

# 4. Write PodcastURL back to the Intelligence Layer —
#    the portal's project page audio player picks it up automatically.
spark.sql(f"""
    UPDATE HorizonView.IntelligenceLayer
    SET PodcastURL = '{sharepoint_url}'
    WHERE ProjectId = '{project_id}'
""")
