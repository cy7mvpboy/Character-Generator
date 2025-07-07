// =================================================================
// DOM 요소 참조
// =================================================================

// --- 핵심 애플리케이션 요소 ---
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeyToggleVisibilityButton = document.getElementById('apiKeyToggleVisibilityButton');
const promptInput = document.getElementById('promptInput');
const generateImageButton = document.getElementById('generateImageButton');
const generateInfoButton = document.getElementById('generateInfoButton');
const clearPromptButton = document.getElementById('clearPromptButton');
const copyInfoButton = document.getElementById('copyInfoButton');
const tokenCountDisplay = document.getElementById('tokenCountDisplay');

// --- 로딩 및 메시지 요소 ---
const loadingContainer = document.getElementById('loadingContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// --- 이미지 처리 요소 ---
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const imagePreviewImg = imagePreview.querySelector('img');
const descriptionLoading = document.getElementById('descriptionLoading');
const characterImageContainer = document.getElementById('characterImageContainer');

// --- 캐릭터 정보 요소 ---
const characterInfoSection = document.getElementById('characterInfoSection');
const characterInfoOutput = document.getElementById('characterInfoOutput');
const characterInfoLoading = document.getElementById('characterInfoLoading');

// --- UI 개선 요소 ---
const modelSelector = document.getElementById('modelSelector');
const aspectRatioContainer = document.getElementById('aspectRatioContainer');
const aspectRatioSelector = document.getElementById('aspectRatioSelector');
const aspectRatioNotice = document.getElementById('aspectRatioNotice');
const promptTemplateContainer = document.getElementById('promptTemplateContainer');

// --- 모달 요소 ---
const apiKeyGuideLink = document.getElementById('showApiKeyGuide');
const apiKeyGuideModal = document.getElementById('apiKeyGuideModal');
const closeModalButton = apiKeyGuideModal.querySelector('.close-button');
const promptUpdateChoiceModal = document.getElementById('promptUpdateChoiceModal');
const choiceOverwriteButton = document.getElementById('choiceOverwriteButton');
const choiceAppendButton = document.getElementById('choiceAppendButton');
const messageModal = document.getElementById('messageModal');
const messageModalText = document.getElementById('messageModalText');
const messageModalOkButton = document.getElementById('messageModalOkButton');


// =================================================================
// 전역 상태 및 변수
// =================================================================

let resolvePromptUpdateChoicePromise; // 프롬프트 업데이트 선택 모달의 promise 리졸버를 저장합니다.
let resolveMessageModalPromise;      // 일반 메시지 모달의 promise 리졸버를 저장합니다.
let currentImageDescription = '';    // 업로드된 이미지에서 생성된 설명을 저장합니다.
let countTokensTimeout;              // 토큰 수 계산 API 호출을 디바운싱하기 위한 타임아웃 ID입니다.

// --- 기본 선택 항목 ---
let selectedModel = 'imagen-3.0-generate-002'; // 기본 이미지 생성 모델입니다.
let selectedAspectRatio = '1:1';               // 기본 이미지 비율입니다.


// =================================================================
// 유틸리티 및 헬퍼 함수
// =================================================================

/**
 * 범용 메시지 모달을 표시하고 사용자 확인을 기다립니다.
 * @param {string} message - 모달에 표시할 메시지입니다.
 * @returns {Promise<void>} 사용자가 "확인"을 클릭하면 리졸브되는 프로미스입니다.
 */
function showMessageModal(message) {
    messageModalText.textContent = message;
    messageModal.style.display = 'flex';
    return new Promise((resolve) => {
        resolveMessageModalPromise = resolve;
    });
}

/**
 * 새로운 이미지 설명을 어떻게 적용할지 묻는 모달을 표시합니다.
 * @param {string} description - Vision API에서 받은 이미지 설명 텍스트입니다.
 * @returns {Promise<string>} 사용자의 선택('overwrite' 또는 'append')으로 리졸브되는 프로미스입니다.
 */
function showPromptUpdateChoiceModal(description) {
    currentImageDescription = description;
    promptUpdateChoiceModal.style.display = 'flex';
    return new Promise((resolve) => {
        resolvePromptUpdateChoicePromise = resolve;
    });
}

/**
 * API 키 입력 필드의 가시성과 타입을 업데이트합니다.
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
 * API 키 텍스트의 가시성을 토글합니다.
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

/**
 * XSS를 방지하기 위해 문자열의 HTML 특수 문자를 이스케이프 처리합니다.
 * @param {string} text - 이스케이프할 문자열입니다.
 * @returns {string} 이스케이프 처리된 HTML 안전 문자열입니다.
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#039;'
    };
    return text.replace(/[&<>""]/g, (m) => map[m]);
}

/**
 * 사용자에게 오류 메시지를 표시합니다.
 * @param {string} message - 표시할 오류 메시지입니다.
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
 * 짧은 시간 후에 사라지는 성공 메시지를 표시합니다.
 * @param {string} message - 표시할 성공 메시지입니다.
 */
function displaySuccessMessage(message) {
    successMessage.textContent = `✅ ${message}`;
    successMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    setTimeout(() => {
        successMessage.classList.add('hidden');
    }, 2000);
}

/**
 * 애플리케이션의 로딩 상태를 설정하거나 해제합니다.
 * @param {boolean} isLoading - 로딩 상태 여부.
 * @param {string} [message=''] - 로딩 중에 표시할 메시지.
 */
function setLoadingState(isLoading, message = '') {
    generateImageButton.disabled = isLoading;
    generateInfoButton.disabled = isLoading;
    clearPromptButton.disabled = isLoading;

    if (isLoading) {
        promptInput.removeEventListener('input', countPromptTokens);
        loadingContainer.classList.remove('hidden');
        loadingSpinner.classList.remove('hidden');
        loadingMessage.textContent = message;
        errorMessage.classList.add('hidden');
        successMessage.classList.add('hidden');
        tokenCountDisplay.classList.add('hidden');
    } else {
        promptInput.addEventListener('input', countPromptTokens);
        loadingContainer.classList.add('hidden');
        loadingMessage.textContent = '';
        countPromptTokens(); // 상태 복원 후 토큰 수 다시 계산
    }
}


// =================================================================
// API 통신 함수
// =================================================================

/**
 * API 호출을 수행하고 UI 상태를 관리하는 범용 함수입니다.
 * @param {object} options - API 호출 옵션.
 * @param {string} options.apiUrl - 요청을 보낼 API URL입니다.
 * @param {object} options.payload - API 요청에 대한 페이로드입니다.
 * @param {string} options.loadingMessage - 로딩 중에 표시할 메시지입니다.
 * @param {function(object): void} options.onSuccess - API 호출 성공 시 실행할 콜백 함수입니다.
 * @param {function(): boolean} [options.preCheck] - API 호출 전 실행할 추가 검사 함수입니다.
 */
async function performApiCall({ apiUrl, payload, loadingMessage, onSuccess, preCheck }) {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        displayErrorMessage("API 키를 먼저 입력해주세요.");
        return;
    }

    if (preCheck && !preCheck()) {
        return;
    }

    setLoadingState(true, loadingMessage);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            // Gemini API의 표준 오류 형식에서 메시지를 추출합니다.
            const errorDetails = result.error?.message || JSON.stringify(result);
            throw new Error(errorDetails);
        }

        onSuccess(result);

    } catch (error) {
        // 모든 오류(네트워크, 파싱, API)를 잡아 사용자에게 표시합니다.
        displayErrorMessage(`오류 발생: ${error.message}`);
        console.error(`${loadingMessage} 중 오류:`, error);
    } finally {
        setLoadingState(false);
    }
}


/**
 * Gemini Vision API를 사용하여 이미지를 설명합니다.
 * @param {string} base64ImageData - base64로 인코딩된 이미지 데이터입니다.
 * @param {string} apiKey - 사용자의 Gemini API 키입니다.
 * @param {string} promptText - 이미지와 함께 보낼 텍스트 프롬프트입니다.
 * @returns {Promise<string>} 이미지 설명 텍스트로 리졸브되는 프로미스입니다.
 */
async function describeImageWithGemini(base64ImageData, apiKey, promptText) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{
            role: "user",
            parts: [
                { text: promptText },
                { inlineData: { mimeType: "image/png", data: base64ImageData } }
            ]
        }],
    };
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
        const errorDetails = result.error?.message || JSON.stringify(result);
        throw new Error(errorDetails);
    }

    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        return result.candidates[0].content.parts[0].text;
    }

    const feedback = result.promptFeedback || result.candidates?.[0]?.finishReason === 'SAFETY';
    if (feedback) {
        const reason = result.promptFeedback?.blockReason || 'SAFETY';
        throw new Error(`이미지 분석이 정책(${reason})에 따라 차단되었습니다.`);
    }

    throw new Error("Gemini Vision API로부터 잘못된 응답 구조를 받았습니다.");
}

/**
 * 선택된 Gemini 이미지 생성 모델을 사용하여 이미지를 생성합니다.
 */
async function generateImage() {
    const userPrompt = promptInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    const preCheck = () => {
        if (!userPrompt) {
            displayErrorMessage("캐릭터 설명을 입력해주세요.");
            return false;
        }
        return true;
    };

    let payload;
    let apiUrl;

    // 선택된 모델에 따라 API 엔드포인트와 페이로드를 구성합니다.
    if (selectedModel === "gemini-2.0-flash-preview-image-generation") {
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
        payload = {
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
        };
    } else {
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:predict?key=${apiKey}`;
        payload = {
            instances: [{ prompt: userPrompt }],
            parameters: { "sampleCount": 1, "aspectRatio": selectedAspectRatio }
        };
    }

    characterImageContainer.innerHTML = '';

    await performApiCall({
        apiUrl,
        payload,
        loadingMessage: '이미지 생성 중...',
        preCheck,
        onSuccess: (result) => {
            let imageUrl = '';
            // 모델에 따라 응답에서 이미지 데이터를 추출합니다.
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
                // --- 생성된 이미지 및 다운로드 버튼 표시 ---
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
            } else {
                const feedback = result.promptFeedback || (result.predictions && result.predictions[0]?.promptFeedback) || (result.candidates && result.candidates[0]?.finishReason === 'SAFETY' && { blockReason: 'SAFETY' });
                if (feedback?.blockReason) {
                     displayErrorMessage(`프롬프트가 정책(${feedback.blockReason})에 위배되어 이미지를 생성할 수 없습니다.`);
                } else {
                    displayErrorMessage("이미지 생성 결과가 예상과 다릅니다. API 응답을 확인해 주세요.");
                }
                console.error("예상치 못한 이미지 생성 응답:", result);
            }
        }
    });
}

/**
 * Gemini LLM을 사용하여 캐릭터 정보(소개, 특징)를 생성합니다.
 */
async function generateCharacterInfo() {
    const userPrompt = promptInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    const preCheck = () => {
        if (!userPrompt) {
            displayErrorMessage("캐릭터 설명을 입력해주세요.");
            return false;
        }
        return true;
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const systemPrompt = `Based on the following character description, generate a short biography, including their personality traits, a brief backstory, and a unique characteristic. Do not use any Markdown syntax. Format the response with clear headings (e.g., 'Personality:', 'Background:', 'Unique Trait:') and use simple line breaks. Do not include any introductory or concluding remarks.\n\nCharacter Description:\n${userPrompt}`;
    const payload = { contents: [{ role: "user", parts: [{ text: systemPrompt }] }] };

    // --- UI 상태: 정보 섹션 로딩 시작 ---
    characterInfoOutput.innerHTML = '';
    characterInfoSection.classList.remove('hidden');
    copyInfoButton.classList.add('hidden');
    characterInfoLoading.classList.remove('hidden');
    characterInfoLoading.textContent = '캐릭터 정보 생성 중...';

    await performApiCall({
        apiUrl,
        payload,
        loadingMessage: '캐릭터 정보 생성 중...',
        preCheck,
        onSuccess: (result) => {
            if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                const text = result.candidates[0].content.parts[0].text;
                characterInfoOutput.innerHTML = `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
                copyInfoButton.classList.remove('hidden');
                displaySuccessMessage("캐릭터 정보 생성 완료!");
            } else {
                const feedback = result.promptFeedback || (result.candidates && result.candidates[0]?.finishReason === 'SAFETY' && { blockReason: 'SAFETY' });
                if (feedback?.blockReason) {
                    displayErrorMessage(`콘텐츠 생성 실패: ${feedback.blockReason}. 프롬프트를 수정해 주세요.`);
                } else {
                    displayErrorMessage("캐릭터 정보 생성 결과가 예상과 다릅니다. API 응답을 확인해 주세요.");
                }
                console.error("예상치 못한 캐릭터 정보 응답:", result);
            }
        }
    });

    // --- UI 상태: 정보 섹션 로딩 종료 ---
    characterInfoLoading.classList.add('hidden');
    characterInfoLoading.textContent = '';
}

/**
 * Gemini API를 사용하여 현재 프롬프트의 토큰 수를 계산합니다.
 * 이 함수는 과도한 API 호출을 피하기 위해 디바운스됩니다.
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

            if (!response.ok) {
                const errorDetails = result.error?.message || JSON.stringify(result);
                throw new Error(errorDetails);
            }

            if (result && typeof result.totalTokens === 'number') {
                tokenCountDisplay.textContent = `현재 프롬프트 토큰 수: ${result.totalTokens}개`;
                tokenCountDisplay.style.color = '#333';
            } else {
                throw new Error("API 응답에서 토큰 수를 찾을 수 없습니다.");
            }
        } catch (error) {
            tokenCountDisplay.textContent = '토큰 수 계산 오류';
            tokenCountDisplay.style.color = '#dc3545';
            console.error("토큰 수 계산 오류:", error.message);
        }
    }, 500);
}


// =================================================================
// 이벤트 핸들러 및 리스너
// =================================================================

/**
 * 이미지 업로드 입력의 'change' 이벤트를 처리합니다.
 * 파일을 읽고 Vision API로 전송한 후 UI를 업데이트합니다.
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

    // --- UI 상태: 로딩 시작 ---
    setLoadingState(true, '이미지 특징 분석 중...');
    descriptionLoading.classList.remove('hidden'); // 이 로딩은 별도로 관리
    descriptionLoading.textContent = '이미지 특징 분석 중...';


    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64ImageData = e.target.result.split(',')[1];
        imagePreviewImg.src = e.target.result;
        imagePreview.style.display = 'block';

        try {
            const imageDescriptionPrompt = `Analyze the provided image and generate a detailed, structured prompt that could be used to recreate a similar image. Deconstruct the image into the following components. Do not include any introductory or concluding remarks, just the structured analysis.\n\n1.  Subject: Describe the main character or focal point, including their appearance, clothing, and expression.\n2.  Setting: Describe the background and environment.\n3.  Style: Identify the artistic style (e.g., photorealistic, anime, watercolor, 3D render).\n4.  Composition & Lighting: Describe the camera angle, shot type (e.g., close-up, wide shot), and lighting (e.g., cinematic, soft, neon).\n5.  Keywords: Provide a list of comma-separated keywords that summarize the key elements for an image generation model.`;
            const imageDescription = await describeImageWithGemini(base64ImageData, apiKey, imageDescriptionPrompt);
            await showPromptUpdateChoiceModal(imageDescription.trim());
            displaySuccessMessage("이미지 분석 완료!");
        } catch (error) {
            displayErrorMessage(`이미지 분석 중 오류 발생: ${error.message}`);
            console.error("이미지 분석 오류:", error);
        } finally {
            // --- UI 상태: 로딩 종료 ---
            setLoadingState(false);
            descriptionLoading.classList.add('hidden');
        }
    };
    reader.readAsDataURL(file);
});

/**
 * 생성된 캐릭터 정보를 클립보드에 복사합니다.
 * 성공 또는 실패 시 사용자에게 피드백을 제공합니다.
 */
copyInfoButton.addEventListener('click', async () => {
    const textToCopy = characterInfoOutput.textContent;
    // 최신 Clipboard API가 사용 가능한 경우 사용합니다.
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(textToCopy);
            const originalText = copyInfoButton.textContent;
            copyInfoButton.textContent = '복사 완료!';
            setTimeout(() => { copyInfoButton.textContent = originalText; }, 1500);
            displaySuccessMessage("정보가 클립보드에 복사되었습니다!");
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
            await showMessageModal('클립보드 복사에 실패했습니다. 수동으로 복사해주세요.');
        }
    } else {
        // 구형 브라우저를 위한 대체 방법입니다.
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = textToCopy;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        try {
            document.execCommand('copy');
            const originalText = copyInfoButton.textContent;
            copyInfoButton.textContent = '복사 완료!';
            setTimeout(() => { copyInfoButton.textContent = originalText; }, 1500);
            displaySuccessMessage("정보가 클립보드에 복사되었습니다!");
        } catch (err) {
            console.error('클립보드 복사 대체 실패:', err);
            await showMessageModal('클립보드 복사에 실패했습니다. 수동으로 복사해주세요.');
        } finally {
            document.body.removeChild(tempTextArea);
        }
    }
});

/**
 * 프롬프트 텍스트 영역의 내용을 지웁니다.
 */
clearPromptButton.addEventListener('click', () => {
    promptInput.value = '';
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
    tokenCountDisplay.classList.add('hidden');
    countPromptTokens();
});

/**
 * 모델 및 이미지 비율에 대한 카드 선택 로직을 처리합니다.
 * @param {HTMLElement} container - 선택 가능한 카드를 포함하는 컨테이너입니다.
 * @param {HTMLElement} selectedCard - 클릭된 카드 요소입니다.
 * @returns {string} 선택된 카드의 데이터 값(모델 또는 비율)입니다.
 */
function handleCardSelection(container, selectedCard) {
    container.querySelectorAll('.card-item').forEach(card => {
        card.classList.remove('selected');
    });
    selectedCard.classList.add('selected');
    return selectedCard.dataset.model || selectedCard.dataset.ratio;
}

/**
 * 선택된 모델의 기능에 따라 이미지 비율 선택기의 UI를 업데이트합니다.
 */
function updateAspectRatioUI() {
    const modelsWithoutAspectRatio = ["gemini-2.0-flash-preview-image-generation"];
    const isDisabled = modelsWithoutAspectRatio.includes(selectedModel);
    
    aspectRatioContainer.classList.toggle('disabled', isDisabled);
    aspectRatioNotice.classList.toggle('hidden', !isDisabled);
}

// --- 모달 관련 이벤트 리스너 ---
messageModalOkButton.addEventListener('click', () => {
    messageModal.style.display = 'none';
    if (resolveMessageModalPromise) {
        resolveMessageModalPromise();
        resolveMessageModalPromise = null;
    }
});

choiceOverwriteButton.addEventListener('click', () => {
    promptUpdateChoiceModal.style.display = 'none';
    if (resolvePromptUpdateChoicePromise) {
        promptInput.value = currentImageDescription;
        resolvePromptUpdateChoicePromise('overwrite');
        resolvePromptUpdateChoicePromise = null;
        countPromptTokens();
    }
});

choiceAppendButton.addEventListener('click', () => {
    promptUpdateChoiceModal.style.display = 'none';
    if (resolvePromptUpdateChoicePromise) {
        const currentPrompt = promptInput.value.trim();
        promptInput.value = currentPrompt ? `${currentPrompt}\n\n${currentImageDescription}` : currentImageDescription;
        resolvePromptUpdateChoicePromise('append');
        resolvePromptUpdateChoicePromise = null;
        countPromptTokens();
    }
});

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

// --- UI 상호작용 이벤트 리스너 ---
modelSelector.addEventListener('click', (event) => {
    const selectedCard = event.target.closest('.model-card');
    if (selectedCard) {
        selectedModel = handleCardSelection(modelSelector, selectedCard);
        updateAspectRatioUI();
    }
});

aspectRatioSelector.addEventListener('click', (event) => {
    const selectedCard = event.target.closest('.aspect-ratio-card');
    if (selectedCard) {
        selectedAspectRatio = handleCardSelection(aspectRatioSelector, selectedCard);
    }
});

promptTemplateContainer.addEventListener('click', (event) => {
    const button = event.target.closest('.prompt-template-btn');
    if (button) {
        const templateName = button.dataset.template;
        if (promptTemplates[templateName]) {
            promptInput.value = promptTemplates[templateName];
            countPromptTokens();
        }
    }
});

// --- 핵심 애플리케이션 이벤트 리스너 ---
generateImageButton.addEventListener('click', generateImage);
generateInfoButton.addEventListener('click', generateCharacterInfo);
promptInput.addEventListener('input', countPromptTokens);
apiKeyInput.addEventListener('input', () => {
    updateApiKeyUI();
    countPromptTokens();
});
apiKeyToggleVisibilityButton.addEventListener('click', toggleApiKeyVisibility);


// =================================================================
// 초기화
// =================================================================

// --- 프롬프트 템플릿 ---
const promptTemplates = {
    fantasy: `Subject: A stoic warrior monk\nAppearance: Shaved head with intricate tattoos, piercing blue eyes, weathered face\nAttire: Wearing simple orange and saffron robes, leather sandals\nPose/Action: Meditating cross-legged, floating slightly above the ground\nSetting: In a serene mountain temple, cherry blossoms are falling\nStyle: Realistic digital painting, dramatic lighting\nQuality: ultra detailed, sharp focus, high quality`,
    'sci-fi': `Subject: A renegade cyborg hacker\nAppearance: Glowing optic data-jacks on temple, synthetic skin, neon-lit hair\nAttire: Wears a worn-out trench coat over a tech-infused jumpsuit\nPose/Action: Typing furiously on a holographic keyboard\nSetting: In a cluttered, high-tech hideout filled with screens and wires\nStyle: Cyberpunk concept art, gritty, neon lighting\nQuality: intricate details, cinematic, HDR`,
    mascot: `Subject: A friendly coffee bean mascot\nAppearance: Big expressive eyes, a cheerful smile, small arms and legs\nAttire: Wearing a small apron with a coffee cup logo\nPose/Action: Holding a steaming cup of coffee, giving a welcoming wave\nSetting: Simple, clean background with a soft, warm color palette\nStyle: 3D render, cartoon style, branding design\nQuality: high quality, family-friendly, brandable`,
    pixel: `Subject: A mysterious rogue in a hood\nAppearance: Only glowing eyes are visible under the dark hood\nAttire: A dark cloak, leather gear, holding a pair of daggers\nPose/Action: Crouching on a rooftop, ready to leap\nSetting: On a rainy, pixelated city rooftop at night\nStyle: 16-bit pixel art, retro game style, Aseprite\nQuality: crisp pixels, limited color palette`
};

/**
 * 창이 로드될 때 애플리케이션을 초기화합니다.
 * UI, 기본값 및 초기 상태를 설정합니다.
 */
window.onload = () => {
    updateApiKeyUI();
    
    // 기본 판타지 템플릿으로 프롬프트를 채웁니다.
    promptInput.value = promptTemplates.fantasy; 

    // 모델 및 이미지 비율에 대한 기본 선택 카드를 설정합니다.
    const defaultModelCard = modelSelector.querySelector(`[data-model="${selectedModel}"]`);
    const defaultRatioCard = aspectRatioSelector.querySelector(`[data-ratio="${selectedAspectRatio}"]`);
    if (defaultModelCard) defaultModelCard.classList.add('selected');
    if (defaultRatioCard) defaultRatioCard.classList.add('selected');

    // UI 상태를 초기화합니다.
    updateAspectRatioUI();
    countPromptTokens();
};