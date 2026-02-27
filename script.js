
        const apiKey = ""; // API key is handled by the environment
        const chatBox = document.getElementById('chat-box');
        const userInput = document.getElementById('user-input');
        const typingUi = document.getElementById('typing-ui');
        const voiceBtn = document.getElementById('voice-btn');
        let isRecording = false;
        let recognition;

        // --- Auto Resize Textarea ---
        function autoResize(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight > 150 ? 150 : textarea.scrollHeight) + 'px';
        }

        // --- Voice Recognition Setup ---
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'uz-UZ';

            recognition.onstart = () => {
                isRecording = true;
                voiceBtn.classList.add('mic-active');
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                userInput.value = transcript;
                autoResize(userInput);
                sendMessage();
            };

            recognition.onerror = () => stopRecording();
            recognition.onend = () => stopRecording();
        }

        function toggleVoice() {
            if (isRecording) {
                recognition.stop();
            } else {
                recognition.start();
            }
        }

        function stopRecording() {
            isRecording = false;
            voiceBtn.classList.remove('mic-active');
        }

        // --- API Interaction ---
        async function sendMessage() {
            const text = userInput.value.trim();
            if (!text) return;

            // Add user bubble
            appendMessage(text, 'user');
            userInput.value = '';
            userInput.style.height = 'auto';
            
            showTyping(true);

            try {
                const response = await callAI(text);
                showTyping(false);
                appendMessage(response, 'ai');
            } catch (error) {
                showTyping(false);
                appendMessage("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.", 'ai');
            }
        }

        async function callAI(prompt) {
            const systemPrompt = "Siz Nexus AI ismli aqlli, do'stona va yordam berishga intiluvchi sun'iy intellektsiz. Har qanday savolga o'zbek tilida batafsil va aniq javob bering. Agar foydalanuvchi kod so'rasa, uni markdown formatida taqdim eting.";
            
            let retryCount = 0;
            const maxRetries = 5;
            const delays = [1000, 2000, 4000, 8000, 16000];

            const runQuery = async () => {
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            systemInstruction: { parts: [{ text: systemPrompt }] }
                        })
                    });

                    if (!response.ok) throw new Error('API Error');
                    const data = await response.json();
                    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Javob topilmadi.";
                } catch (err) {
                    if (retryCount < maxRetries) {
                        await new Promise(r => setTimeout(r, delays[retryCount]));
                        retryCount++;
                        return runQuery();
                    }
                    throw err;
                }
            };

            return await runQuery();
        }

        // --- UI Updates ---
        function appendMessage(content, role) {
            const wrapper = document.createElement('div');
            wrapper.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
            
            const bubble = document.createElement('div');
            bubble.className = `max-w-[85%] md:max-w-[70%] p-4 rounded-2xl shadow-sm ${role === 'user' ? 'user-bubble text-white rounded-tr-none' : 'ai-bubble text-slate-200 rounded-tl-none'}`;
            
            // Basic Markdown handling (code blocks)
            let formattedContent = content
                .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                .replace(/\n/g, '<br>');

            bubble.innerHTML = formattedContent;
            
            // Add utility buttons for AI response
            if (role === 'ai') {
                const tools = document.createElement('div');
                tools.className = "flex gap-3 mt-3 pt-3 border-t border-slate-700/50";
                tools.innerHTML = `
                    <button onclick="copyToClipboard(this)" class="text-[10px] text-slate-500 hover:text-blue-400 transition flex items-center gap-1">
                        <i class="fas fa-copy"></i> NUSXA OLISH
                    </button>
                    <button onclick="speakText(this)" class="text-[10px] text-slate-500 hover:text-blue-400 transition flex items-center gap-1">
                        <i class="fas fa-volume-up"></i> TINGLASH
                    </button>
                `;
                bubble.appendChild(tools);
            }

            wrapper.appendChild(bubble);
            chatBox.appendChild(wrapper);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        function showTyping(show) {
            typingUi.classList.toggle('hidden', !show);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        function setQuery(query) {
            userInput.value = query;
            autoResize(userInput);
            sendMessage();
        }

        function clearChat() {
            if (confirm("Haqiqatan ham suhbatni tozalaysizmi?")) {
                chatBox.innerHTML = '';
                appendMessage("Suhbat tozalandi. Sizga qanday yordam berishim mumkin?", "ai");
            }
        }

        // --- Utilities ---
        function copyToClipboard(btn) {
            const text = btn.closest('.ai-bubble').innerText.replace(/NUSXA OLISH|TINGLASH/g, '').trim();
            const el = document.createElement('textarea');
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check text-green-500"></i> NUSXALANDI';
            setTimeout(() => btn.innerHTML = originalText, 2000);
        }

        function speakText(btn) {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                btn.innerHTML = '<i class="fas fa-volume-up"></i> TINGLASH';
                return;
            }
            const text = btn.closest('.ai-bubble').innerText.replace(/NUSXA OLISH|TINGLASH/g, '').trim();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'uz-UZ';
            
            utterance.onstart = () => btn.innerHTML = '<i class="fas fa-stop text-red-500"></i> TO\'XTATISH';
            utterance.onend = () => btn.innerHTML = '<i class="fas fa-volume-up"></i> TINGLASH';
            
            window.speechSynthesis.speak(utterance);
        }

        // Enter key to send
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });