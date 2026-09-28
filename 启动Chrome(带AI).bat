@echo off
chcp 65001 >nul
title 启动 Google Chrome (已开启 Gemini AI)

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --variations-override-country=us --glic-dev --enable-features=Glic,GlicActor,GlicActorUi,GlicActorUiMagicCursor,GlicActorAutofill,GlicSelectionPrompt,GlicUseToolbarHeightSidePanel,GlicGuest,GlicPinned,GlicZeroStateSuggestions,PromptAPI,OptimizationGuideOnDeviceModel --disable-features=GlicUseSessionCountryForFiltering,DisableGlic
