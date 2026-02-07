from: https://x.com/ElevenLabsDevs/status/2019729311901638663

Let your OpenClaw call you on the phone using ElevenAgents
In the last article we covered how to make a phone call to your OpenClaw bot. This one enables your agent to initiate calls to your phone!
Wouldn’t it be cool if your openclaw called you in the morning to wake up and brief you on the day ahead? Or called you to report that your coding agent failed? Or perhaps to check on your gym progress?
Prerequisites
This guide requires integrations covered in the last article:
Using ElevenAgents as voice orchestration layer for OpenClaw
Using Twilio as phone numbers integration layer in ElevenAgents
Pro tip: If not yet set up, copy the article into your coding agent and it will handle most steps for you.
Enabling the skill
Ask your OpenClaw bot:
Install these skills globally: npx skills add elevenlabs/skills
This will install ElevenLabs skills that teach your OpenClaw how to interact with ElevenLabs API.
Now, go to dashboard:
bash
openclaw dashboard
Go to the skills tab, find “agents” and put your ElevenLabs API key in the field next to it
Note: for extra security, make sure ElevenLabs API key you create has a scope limited to “agents-write” and reasonable spend limit
Making a call
Ask your OpenClaw bot:
Call <your phone number> using agents skill
It would pick up ElevenLabs API key provided above, and ask you for two more things:

Agent ID — copy from your ElevenAgent page
Outbound Phone ID — available in phone numbers tab
After successful call, ask your OpenClaw to remember those IDs, so that it can make next call autonomously:
Put these IDs in your memory
Preserving calling agent
By default, every call would spin off a new OpenClaw agent instance, having no shared context except memory.
If you want all calls to share one agent instance, provide x-openclaw-session-key header to your custom LLM.
Make it autonomous with cron
To make your agent call you autonomously when it spots something, add a cron job in OpenClaw UI (or just ask openclaw bot to set it up for you!).
