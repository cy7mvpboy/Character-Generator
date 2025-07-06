// DOM 요소 가져오기
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeyToggleVisibilityButton = document.getElementById('apiKeyToggleVisibilityButton');
const promptInput = document.getElementById('promptInput');
const generateImageButton = document.getElementById('generateImageButton');
const generateInfoButton = document.getElementById('generateInfoButton');
const loadingContainer = document.getElementById('loadingContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const loadingMessage = document.getElementById('loadingMessage');
const characterImageContainer = document.getElementById('characterImageContainer');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const imagePreviewImg = imagePreview.querySelector('img');
const descriptionLoading = document.getElementById('descriptionLoading');
const characterInfoSection = document.getElementById('characterInfoSection');
const characterInfoOutput = document.getElementById('characterInfoOutput');
const characterInfoLoading = document.getElementById('characterInfoLoading');
const clearPromptButton = document.getElementById('clearPromptButton');
const copyInfoButton = document.getElementById('copyInfoButton');
const tokenCountDisplay = document.getElementById('tokenCountDisplay');

// UI 개선을 위한 새로운 DOM 요소
const modelSelector = document.getElementById('modelSelector');
const aspectRatioContainer = document.getElementById('aspectRatioContainer');
const aspectRatioSelector = document.getElementById('aspectRatioSelector');
const aspectRatioNotice = document.getElementById('aspectRatioNotice');
const promptTemplateContainer = document.getElementById('promptTemplateContainer');

// 모달 관련 DOM 요소
const apiKeyGuideLink = document.getElementById('showApiKeyGuide');
const apiKeyGuideModal = document.getElementById('apiKeyGuideModal');
const closeModalButton = apiKeyGuideModal.querySelector('.close-button');
const promptUpdateChoiceModal = document.getElementById('promptUpdateChoiceModal');
const choiceOverwriteButton = document.getElementById('choiceOverwriteButton');
const choiceAppendButton = document.getElementById('choiceAppendButton');
const messageModal = document.getElementById('messageModal');
const messageModalText = document.getElementById('messageModalText');
const messageModalOkButton = document.getElementById('messageModalOkButton');

// Promise 및 이미지 분석 결과 저장 변수
let resolvePromptUpdateChoicePromise;
let resolveMessageModalPromise;
let currentImageDescription = '';
let countTokensTimeout;

// 선택된 값 저장을 위한 변수
let selectedModel = 'imagen-3.0-generate-002'; // 기본값
let selectedAspectRatio = '1:1'; // 기본값

// --- 유틸리티 함수 --- //

/**
 * 일반 메시지 모달을 표시하고 사용자의 '확인' 응답을 기다립니다.
 * @param {string} message - 모달에 표시할 메시지.
 * @returns {Promise<void>}
 */
function showMessageModal(message) {
    messageModalText.textContent = message;
    messageModal.style.display = 'flex';
    return new Promise((resolve) => {
        resolveMessageModalPromise = resolve;
    });
}

messageModalOkButton.addEventListener('click', () => {
    messageModal.style.display = 'none';
    if (resolveMessageModalPromise) {
        resolveMessageModalPromise();
        resolveMessageModalPromise = null;
    }
});

/**
 * 이미지 분석 결과 적용 방식 선택 팝업을 표시합니다.
 * @param {string} description - 이미지 분석 결과 텍스트.
 * @returns {Promise<string>} 사용자가 선택한 방식 ('overwrite' 또는 'append').
 */
function showPromptUpdateChoiceModal(description) {
    currentImageDescription = description;
    return new Promise((resolve) => {
        promptUpdateChoiceModal.style.display = 'flex';
        resolvePromptUpdateChoicePromise = resolve;
    });
}

choiceOverwriteButton.addEventListener('click', () => {
    promptUpdateChoiceModal.style.display = 'none';
    if (resolvePromptUpdateChoicePromise) {
        promptInput.value = currentImageDescription;
        resolvePromptUpdateChoicePromise('overwrite');
        resolvePromptUpdateChoicePromise = null;
    }
});

choiceAppendButton.addEventListener('click', () => {
    promptUpdateChoiceModal.style.display = 'none';
    if (resolvePromptUpdateChoicePromise) {
        const currentPrompt = promptInput.value.trim();
        if (currentPrompt) {
            promptInput.value = currentPrompt + '\n\n' + currentImageDescription;
        } else {
            promptInput.value = currentImageDescription;
        }
        resolvePromptUpdateChoicePromise('append');
        resolvePromptUpdateChoicePromise = null;
    }
});

/**
 * API 키 입력 필드의 표시 상태를 업데이트합니다.
 */
function updateApiKeyUI() {
    if (apiKeyInput.value.trim().length > 0) {
        apiKeyInput.type = 'password';
        apiKeyToggleVisibilityButton.classList.remove('hidden');
        apiKeyToggleVisibilityButton.textContent = '보기';
    } else {
        apiKeyInput.type = 'text';
        apiKeyToggleVisibilityButton.classList.add('hidden');
    }
}

/**
 * API 키 입력 필드의 가시성을 토글합니다.
 */
function toggleApiKeyVisibility() {
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        apiKeyToggleVisibilityButton.textContent = '숨기기';
    } else {
        apiKeyInput.type = 'password';
        apiKeyToggleVisibilityButton.textContent = '보기';
    }
}

apiKeyGuideLink.addEventListener('click', (event) => {
    event.preventDefault();
    apiKeyGuideModal.style.display = 'flex';
});

closeModalButton.addEventListener('click', () => {
    apiKeyGuideModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === apiKeyGuideModal) {
        apiKeyGuideModal.style.display = 'none';
    }
});

/**
 * HTML 안전하게 텍스트를 이스케이프합니다.
 * @param {string} text - 이스케이프할 텍스트.
 * @returns {string} 이스케이프된 텍스트.
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * 에러 메시지를 표시합니다.
 * @param {string} message - 표시할 에러 메시지.
 */
function displayErrorMessage(message) {
    errorMessage.textContent = `⚠️ ${message}`;
    errorMessage.classList.remove('hidden');
    errorMessage.classList.add('error-highlight');
    successMessage.classList.add('hidden');
    tokenCountDisplay.classList.add('hidden');
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
        errorMessage.classList.remove('error-highlight');
    }, 2000);
}

/**
 * 성공 메시지를 표시하고 잠시 후 숨깁니다.
 * @param {string} message - 표시할 성공 메시지.
 */
function displaySuccessMessage(message) {
    successMessage.textContent = `✅ ${message}`;
    successMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    setTimeout(() => {
        successMessage.classList.add('hidden');
    }, 2000);
}

// --- API 통신 함수 --- //

/**
 * Gemini Vision API를 사용하여 이미지 설명을 가져옵니다.
 */
imageUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
        imagePreview.style.display = 'none';
        imagePreviewImg.src = '';
        return;
    }

    if (!file.type.startsWith('image/')) {
        displayErrorMessage("이미지 파일만 업로드할 수 있습니다.");
        imagePreview.style.display = 'none';
        imagePreviewImg.src = '';
        imageUpload.value = '';
        return;
    }

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        displayErrorMessage("API 키를 먼저 입력해주세요.");
        imageUpload.value = '';
        return;
    }

    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
    tokenCountDisplay.classList.add('hidden');
    descriptionLoading.classList.remove('hidden');
    descriptionLoading.textContent = '이미지 특징 분석 중...';
    generateImageButton.disabled = true;
    generateInfoButton.disabled = true;
    clearPromptButton.disabled = true;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64ImageData = e.target.result.split(',')[1];
        imagePreviewImg.src = e.target.result;
        imagePreview.style.display = 'block';

        try {
            const imageDescriptionPrompt = `Based on the uploaded image, generate a detailed character description following these sections. Focus on visual elements. Do not include any introductory or concluding remarks, just the structured description.\n\nSubject: [Describe the main subject of the character, e.g., 'A cute animal mascot', 'A stylized human character']\nContext & Background: [Describe the environment or context the character is in, e.g., 'Against a plain studio background', 'In a simple, abstract setting']\nStyle: [Describe the art style, e.g., 'Flat design with bold outlines', 'Vector illustration with clean lines', 'Minimalist graphic design']\nDetailed Description & Quality: [Provide detailed visual attributes, including appearance (shape, color palette, features, expression), unique traits, props, symbolic elements, and desired image quality (e.g., 'high-quality', 'crisp', 'clean', 'professional branding design').]`;
            const imageDescription = await describeImageWithGemini(base64ImageData, apiKey, imageDescriptionPrompt);
            await showPromptUpdateChoiceModal(imageDescription.trim());
            displaySuccessMessage("이미지 분석 완료!");
        } catch (error) {
            displayErrorMessage("이미지 분석 중 오류가 발생했습니다. API 키가 올바른지 확인하거나 잠시 후 다시 시도해 주세요.");
            console.error("이미지 분석 중 오류:", error);
        } finally {
            descriptionLoading.classList.add('hidden');
            generateImageButton.disabled = false;
            generateInfoButton.disabled = false;
            clearPromptButton.disabled = false;
            countPromptTokens();
        }
    };
    reader.readAsDataURL(file);
});

/**
 * Gemini Vision API를 사용하여 이미지 설명을 가져옵니다.
 * @param {string} base64ImageData - Base64로 인코딩된 이미지 데이터.
 * @param {string} apiKey - Gemini API 키.
 * @param {string} promptText - Vision API에 보낼 텍스트 프롬프트.
 * @returns {Promise<string>} 이미지 설명 텍스트.
 */
async function describeImageWithGemini(base64ImageData, apiKey, promptText) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: "image/png", data: base64ImageData } }
                ]
            }
        ],
    };
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        return result.candidates[0].content.parts[0].text;
    } else {
        throw new Error("Gemini Vision API 응답이 예상과 다릅니다.");
    }
}

/**
 * 이미지 생성 API를 사용하여 이미지를 생성합니다.
 */
async function generateImage() {
    const apiKey = apiKeyInput.value.trim();
    let userPrompt = promptInput.value.trim();

    if (!apiKey) {
        displayErrorMessage("API 키를 먼저 입력해주세요.");
        return;
    }
    if (!userPrompt) {
        displayErrorMessage("캐릭터 설명을 입력해주세요.");
        return;
    }

    generateImageButton.disabled = true;
    generateInfoButton.disabled = true;
    clearPromptButton.disabled = true;
    promptInput.removeEventListener('input', countPromptTokens);
    loadingContainer.classList.remove('hidden');
    loadingSpinner.classList.remove('hidden');
    loadingMessage.textContent = '이미지 생성 중...';
    characterImageContainer.innerHTML = '';
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
    tokenCountDisplay.classList.add('hidden');

    try {
        let payload;
        let apiUrl;

        if (selectedModel === "gemini-2.0-flash-preview-image-generation") {
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
            payload = {
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
            };
        } else {
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:predict?key=${apiKey}`;
            payload = {
                instances: { prompt: userPrompt },
                parameters: { "sampleCount": 1, "aspectRatio": selectedAspectRatio }
            };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorDetails = `HTTP 오류! 상태: ${response.status}`;
            try {
                const errorResult = await response.json();
                errorDetails = errorResult.error?.message || JSON.stringify(errorResult);
            } catch (e) { /* 무시 */ }
            throw new Error(errorDetails);
        }

        const result = await response.json();
        let imageUrl = '';

        if (selectedModel === "gemini-2.0-flash-preview-image-generation") {
            const imagePart = result.candidates?.[0]?.content?.parts.find(part => part.inlineData);
            if (imagePart?.inlineData?.data) {
                imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            }
        } else {
            if (result.predictions?.[0]?.bytesBase64Encoded) {
                imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
            }
        }

        if (imageUrl) {
            const imgElement = document.createElement('img');
            imgElement.src = imageUrl;
            imgElement.alt = "생성된 캐릭터 이미지";
            characterImageContainer.appendChild(imgElement);

            const downloadButton = document.createElement('button');
            downloadButton.textContent = '이미지 다운로드';
            downloadButton.classList.add('action-button', 'mt-4');
            downloadButton.onclick = () => {
                const a = document.createElement('a');
                a.href = imageUrl;
                a.download = 'generated_character.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
            characterImageContainer.appendChild(downloadButton);
            displaySuccessMessage("이미지 생성 완료!");
            countPromptTokens();
        } else {
            const feedback = result.promptFeedback || (result.predictions && result.predictions[0]?.promptFeedback);
            if (feedback?.blockReason) {
                 displayErrorMessage(`프롬프트가 정책(${feedback.blockReason})에 위배되어 이미지를 생성할 수 없습니다.`);
            } else {
                displayErrorMessage("이미지 생성 결과가 예상과 다릅니다. API 응답을 확인해 주세요.");
            }
            console.error("이미지 생성 결과가 예상과 다릅니다:", result);
        }
    } catch (error) {
        displayErrorMessage(`이미지 생성 중 오류 발생: ${error.message}`);
        console.error("이미지 생성 중 오류:", error);
    } finally {
        generateImageButton.disabled = false;
        generateInfoButton.disabled = false;
        clearPromptButton.disabled = false;
        promptInput.addEventListener('input', countPromptTokens);
        loadingContainer.classList.add('hidden');
        loadingMessage.textContent = '';
    }
}

/**
 * Gemini LLM을 사용하여 캐릭터 정보를 생성합니다.
 */
async function generateCharacterInfo() {
    const apiKey = apiKeyInput.value.trim();
    let userPrompt = promptInput.value.trim();

    if (!apiKey) {
        displayErrorMessage("API 키를 먼저 입력해주세요.");
        return;
    }
    if (!userPrompt) {
        displayErrorMessage("캐릭터 설명을 입력해주세요.");
        return;
    }

    generateImageButton.disabled = true;
    generateInfoButton.disabled = true;
    clearPromptButton.disabled = true;
    promptInput.removeEventListener('input', countPromptTokens);
    characterInfoLoading.classList.remove('hidden');
    characterInfoLoading.textContent = '캐릭터 정보 생성 중...';
    characterInfoOutput.innerHTML = '';
    characterInfoSection.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    copyInfoButton.classList.add('hidden');
    successMessage.classList.add('hidden');
    tokenCountDisplay.classList.add('hidden');

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const chatHistory = [{ role: "user", parts: [{ text: `Based on the following character description, generate a short biography, including their personality traits, a brief backstory, and a unique characteristic. Do not use any Markdown syntax. Format the response with clear headings (e.g., 'Personality:', 'Background:', 'Unique Trait:') and use simple line breaks. Do not include any introductory or concluding remarks.\n\nCharacter Description:\n${userPrompt}` }] }];
        const payload = { contents: chatHistory };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorData = { message: `HTTP 오류! 상태: ${response.status}` };
            try {
                const errorJson = await response.json();
                errorData.message = errorJson.error?.message || JSON.stringify(errorJson);
            } catch (e) {
                errorData.message = await response.text();
            }
            throw new Error(errorData.message);
        }

        const result = await response.json();

        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = result.candidates[0].content.parts[0].text;
            characterInfoOutput.innerHTML = `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
            copyInfoButton.classList.remove('hidden');
            displaySuccessMessage("캐릭터 정보 생성 완료!");
            countPromptTokens();
        } else {
            const feedback = result.promptFeedback;
            if (feedback?.blockReason) {
                displayErrorMessage(`콘텐츠 생성 실패: ${feedback.blockReason}. 프롬프트를 수정해 주세요.`);
            } else {
                displayErrorMessage("캐릭터 정보 생성 결과가 예상과 다릅니다. API 응답을 확인해 주세요.");
            }
            console.error("캐릭터 정보 생성 결과가 예상과 다릅니다:", result);
        }
    } catch (error) {
        displayErrorMessage(`오류 발생: ${error.message}`);
        console.error("캐릭터 정보 생성 중 오류:", error);
    } finally {
        generateImageButton.disabled = false;
        generateInfoButton.disabled = false;
        clearPromptButton.disabled = false;
        promptInput.addEventListener('input', countPromptTokens);
        characterInfoLoading.classList.add('hidden');
        characterInfoLoading.textContent = '';
    }
}

/**
 * 현재 프롬프트의 토큰 수를 계산하여 표시합니다.
 */
async function countPromptTokens() {
    if (countTokensTimeout) {
        clearTimeout(countTokensTimeout);
    }

    countTokensTimeout = setTimeout(async () => {
        const apiKey = apiKeyInput.value.trim();
        const userPrompt = promptInput.value.trim();

        if (!apiKey) {
            tokenCountDisplay.classList.add('hidden');
            return;
        }
        if (!userPrompt) {
            tokenCountDisplay.classList.remove('hidden');
            tokenCountDisplay.textContent = '프롬프트를 입력해주세요.';
            tokenCountDisplay.style.color = '#999';
            return;
        }

        tokenCountDisplay.classList.remove('hidden');
        tokenCountDisplay.textContent = '토큰 수 계산 중...';
        tokenCountDisplay.style.color = '#666';
        errorMessage.classList.add('hidden');
        successMessage.classList.add('hidden');

        try {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:countTokens?key=${apiKey}`;
            const payload = { contents: [{ role: "user", parts: [{ text: userPrompt }] }] };
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result && typeof result.totalTokens === 'number') {
                tokenCountDisplay.textContent = `현재 프롬프트 토큰 수: ${result.totalTokens}개`;
                tokenCountDisplay.style.color = '#333';
            } else {
                tokenCountDisplay.textContent = '토큰 수 계산 실패';
                tokenCountDisplay.style.color = '#dc3545';
                console.error("토큰 수 계산 결과가 예상과 다릅니다:", result);
            }
        } catch (error) {
            tokenCountDisplay.textContent = '토큰 수 계산 오류';
            tokenCountDisplay.style.color = '#dc3545';
            console.error("토큰 수 계산 중 오류:", error);
        }
    }, 500);
}

/**
 * 캐릭터 정보를 클립보드에 복사합니다.
 */
copyInfoButton.addEventListener('click', async () => {
    const textToCopy = characterInfoOutput.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(textToCopy);
            const originalText = copyInfoButton.textContent;
            copyInfoButton.textContent = '복사 완료!';
            setTimeout(() => {
                copyInfoButton.textContent = originalText;
            }, 1500);
            displaySuccessMessage("정보가 클립보드에 복사되었습니다!");
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
            await showMessageModal('클립보드 복사에 실패했습니다. 수동으로 복사해주세요.');
        }
    } else {
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = textToCopy;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        try {
            document.execCommand('copy');
            const originalText = copyInfoButton.textContent;
            copyInfoButton.textContent = '복사 완료!';
            setTimeout(() => {
                copyInfoButton.textContent = originalText;
            }, 1500);
            displaySuccessMessage("정보가 클립보드에 복사되었습니다!");
        } catch (err) {
            console.error('클립보드 복사 실패 (대체):', err);
            await showMessageModal('클립보드 복사에 실패했습니다. 수동으로 복사해주세요.');
        } finally {
            document.body.removeChild(tempTextArea);
        }
    }
});

/**
 * 프롬프트 입력창의 내용을 초기화합니다.
 */
clearPromptButton.addEventListener('click', () => {
    promptInput.value = '';
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
    tokenCountDisplay.classList.add('hidden');
    countPromptTokens();
});

/**
 * 페이지 로드 시 API 키를 localStorage에서 로드하고 저장합니다.
 */
function initializeApiKeyStorage() {
    const savedApiKey = localStorage.getItem('geminiApiKey');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        updateApiKeyUI();
    }

    apiKeyInput.addEventListener('input', () => {
        const currentApiKey = apiKeyInput.value.trim();
        if (currentApiKey) {
            localStorage.setItem('geminiApiKey', currentApiKey);
        } else {
            localStorage.removeItem('geminiApiKey');
        }
        updateApiKeyUI();
        countPromptTokens();
    });
}

// --- UI 개선을 위한 새로운 함수들 ---

/**
 * 카드 선택 이벤트를 처리합니다.
 * @param {HTMLElement} container - 카드들을 담고 있는 컨테이너.
 * @param {HTMLElement} selectedCard - 사용자가 클릭한 카드.
 * @returns {string} 선택된 카드의 데이터 값.
 */
function handleCardSelection(container, selectedCard) {
    // 모든 카드에서 'selected' 클래스 제거
    container.querySelectorAll('.card-item').forEach(card => {
        card.classList.remove('selected');
    });
    // 클릭된 카드에만 'selected' 클래스 추가
    selectedCard.classList.add('selected');
    // 데이터 속성 값 반환
    return selectedCard.dataset.model || selectedCard.dataset.ratio;
}

/**
 * 선택된 모델에 따라 비율 선택 UI의 상태를 업데이트합니다.
 */
function updateAspectRatioUI() {
    // 비율 선택을 지원하지 않는 모델 목록
    const modelsWithoutAspectRatio = ["gemini-2.0-flash-preview-image-generation"];

    if (modelsWithoutAspectRatio.includes(selectedModel)) {
        aspectRatioContainer.classList.add('disabled');
        aspectRatioNotice.classList.remove('hidden');
    } else {
        aspectRatioContainer.classList.remove('disabled');
        aspectRatioNotice.classList.add('hidden');
    }
}

// 모델 선택 이벤트 리스너
modelSelector.addEventListener('click', (event) => {
    const selectedCard = event.target.closest('.model-card');
    if (selectedCard) {
        selectedModel = handleCardSelection(modelSelector, selectedCard);
        updateAspectRatioUI(); // 모델 변경 시 비율 UI 상태 업데이트
    }
});

// 비율 선택 이벤트 리스너
aspectRatioSelector.addEventListener('click', (event) => {
    const selectedCard = event.target.closest('.aspect-ratio-card');
    if (selectedCard) {
        selectedAspectRatio = handleCardSelection(aspectRatioSelector, selectedCard);
    }
});

// --- 프롬프트 템플릿 기능 추가 ---

const promptTemplates = {
    fantasy: `Subject: A wise elf mage with glowing eyes\nContext & Background: In an ancient, enchanted forest at dusk\nStyle: Detailed digital painting, fantasy art, cinematic lighting\nDetailed Description & Quality: Wearing intricate silver robes, holding a crystal staff, high-quality, detailed, 4K`,
    'sci-fi': `Subject: A sleek cyborg assassin\nContext & Background: On a neon-lit rooftop in a futuristic cyberpunk city\nStyle: Sci-fi concept art, realistic, Blade Runner aesthetic\nDetailed Description & Quality: Chrome exoskeleton, glowing red optic sensors, holding a plasma rifle, HDR, cinematic, detailed textures`,
    mascot: `Subject: A friendly, cute bear mascot for a honey brand\nContext & Background: Simple, clean studio background, vibrant colors\nStyle: 3D render, cartoon style, soft lighting\nDetailed Description & Quality: Round and fluffy body, big welcoming eyes, holding a honey pot, brandable, high-quality, family-friendly`,
    pixel: `Subject: A heroic knight in full armor\nContext & Background: Standing in front of a pixelated castle\nStyle: 16-bit pixel art, retro video game style, Aseprite\nDetailed Description & Quality: Shiny plate armor, holding a large sword and shield, vibrant color palette, crisp pixels, SNES style`
};

promptTemplateContainer.addEventListener('click', (event) => {
    const button = event.target.closest('.prompt-template-btn');
    if (button) {
        const templateName = button.dataset.template;
        if (promptTemplates[templateName]) {
            promptInput.value = promptTemplates[templateName];
            // 프롬프트가 변경되었으므로 토큰 수를 다시 계산합니다.
            countPromptTokens();
        }
    }
});


// --- 페이지 로드 시 초기화 ---
window.onload = () => {
    initializeApiKeyStorage();
    updateApiKeyUI();
    // 페이지 로드 시 첫 번째 예시 프롬프트 대신, 첫 번째 템플릿을 채워줍니다.
    promptInput.value = promptTemplates.fantasy; 

    // 기본 모델 및 비율 카드 선택
    const defaultModelCard = modelSelector.querySelector(`[data-model="${selectedModel}"]`);
    const defaultRatioCard = aspectRatioSelector.querySelector(`[data-ratio="${selectedAspectRatio}"]`);
    if (defaultModelCard) defaultModelCard.classList.add('selected');
    if (defaultRatioCard) defaultRatioCard.classList.add('selected');

    updateAspectRatioUI(); // 초기 UI 상태 설정
    countPromptTokens();
};

// 기존 이벤트 리스너들
generateImageButton.addEventListener('click', generateImage);
generateInfoButton.addEventListener('click', generateCharacterInfo);
promptInput.addEventListener('input', countPromptTokens);
apiKeyToggleVisibilityButton.addEventListener('click', toggleApiKeyVisibility);
