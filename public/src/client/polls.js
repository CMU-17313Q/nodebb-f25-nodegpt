'use strict';

define('forum/polls', ['hooks', 'alerts'], function (hooks, alerts) {
	const Polls = {};
	let buttonRegistered = false; // avoid duplicate formatting button registration (also used as "registering" guard)

	function init() {
		// Load poll styles
		loadPollStyles();

		// Register poll button in composer formatting API
		registerFormattingButton();

		// Add poll functionality to composer when it's loaded
		hooks.on('action:composer.loaded', function (data) {
			console.log('Composer loaded event:', data); // Debug log
			addPollPanel(data.postContainer);
			setTimeout(() => ensureOrMovePollButton(data.postContainer), 50);
		});

		// Handle composer enhancement
		hooks.on('action:composer.enhance', function (data) {
			console.log('Composer enhance event:', data); // Debug log
			addPollPanel(data.container);
			setTimeout(() => ensureOrMovePollButton(data.container), 50);
		});

		// After composer is fully enhanced by core, ensure our panel exists and button placement
		hooks.on('action:composer.enhanced', function (data) {
			addPollPanel(data.postContainer);
			setTimeout(() => ensureOrMovePollButton(data.postContainer), 50);
		});

		// Also try to add polls to any existing composer
		setTimeout(function () {
			const existingComposer = $('.composer');
			if (existingComposer.length) {
				console.log('Adding polls to existing composer'); // Debug log
				addPollPanel(existingComposer);
				ensureOrMovePollButton(existingComposer);
			}
		}, 1000);

		// Avoid global intervals; dedupe performed on lifecycle events only
	}

	// Ensure only one poll button exists within this composer and position it before upload
	function ensureOrMovePollButton(composer) {
		if (!composer || !composer.length) return;

		const formattingBar = composer.find('.formatting-bar');
		if (!formattingBar.length) return;

		const group = formattingBar.find('.formatting-group');
		if (!group.length) return;

		// Deduplicate within this composer only
		const pollLis = group.find('[data-format="poll"]').closest('li');
		if (pollLis.length > 1) {
			// Keep the first, remove the rest
			pollLis.slice(1).remove();
		}

		// Place before the upload LI if present
		const uploadLi = group.find('#fileForm').closest('li');
		if (uploadLi.length && pollLis.length) {
			uploadLi.before(pollLis.first());
		}
	}

	Polls.init = init;

	function loadPollStyles() {
		if (document.getElementById('polls-styles')) {
			return; // Already loaded
		}

		const style = document.createElement('style');
		style.id = 'polls-styles';
		style.textContent = `
			/* Poll builder styles */
			.poll-panel {
				background: #f8f9fa;
				border: 1px solid #dee2e6;
				border-radius: 8px;
				margin-top: 15px;
				animation: slideDown 0.3s ease-out;
				min-height: auto;
				height: auto;
				max-width: 640px;
				width: 100%;
				overflow: visible;
				max-height: none;
				overflow-y: visible;
				padding: 20px;
			}

			@keyframes slideDown {
				from {
					opacity: 0;
					transform: translateY(-10px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}

			.poll-header {
				border-bottom: 1px solid #dee2e6;
				padding-bottom: 10px;
				margin-bottom: 15px;
			}

			.poll-header h6 {
				color: #495057;
				font-weight: 600;
			}

			.poll-close {
				border: none;
				background: none;
				color: #6c757d;
				font-size: 14px;
				padding: 4px 8px;
				border-radius: 4px;
				transition: all 0.2s ease;
			}

			.poll-close:hover {
				background-color: #e9ecef;
				color: #495057;
			}

			.poll-question {
				font-weight: 500;
				border-radius: 6px;
				transition: border-color 0.2s ease;
			}

			.poll-question:focus {
				border-color: #86b7fe;
				box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
			}

			.poll-option {
				margin-bottom: 15px;
			}

			.poll-option-input {
				border-radius: 6px 0 0 6px;
				transition: border-color 0.2s ease;
			}

			.poll-option-input:focus {
				border-color: #86b7fe;
				box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
				z-index: 3;
			}

			.poll-remove-option {
				border-radius: 0 6px 6px 0;
				border-left: 0;
				transition: all 0.2s ease;
			}

			.poll-remove-option:hover:not(:disabled) {
				background-color: #dc3545;
				border-color: #dc3545;
				color: white;
			}

			.poll-remove-option:disabled {
				opacity: 0.6;
				cursor: not-allowed;
			}

			.poll-add-option {
				border-radius: 6px;
				font-weight: 500;
				transition: all 0.2s ease;
				border: 2px dashed #007bff;
				background: transparent;
				color: #007bff;
			}

			.poll-add-option:hover {
				background: #007bff;
				color: white;
				border-style: solid;
			}

			.poll-add-option:disabled {
				opacity: 0.6;
				cursor: not-allowed;
				border-color: #6c757d;
				color: #6c757d;
			}

			.poll-add-option:disabled:hover {
				background: transparent;
				color: #6c757d;
			}

			.poll-validation {
				animation: fadeIn 0.3s ease-out;
			}

			@keyframes fadeIn {
				from {
					opacity: 0;
					transform: translateY(-5px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}

			.poll-validation-message {
				margin-bottom: 0;
				font-size: 14px;
				border-radius: 6px;
			}

			.poll-option-counter, .poll-question-counter {
				font-size: 12px;
				color: #6c757d;
				margin-top: 4px;
			}

			/* Poll button in formatting bar */
			[data-format="poll"].active {
				background-color: #e7f3ff !important;
				color: #0066cc !important;
			}

			[data-format="poll"].active i {
				color: #0066cc !important;
			}

			/* Responsive styles */
			@media (max-width: 576px) {
				.poll-panel {
					margin-left: -15px;
					margin-right: -15px;
					border-radius: 0;
					border-left: none;
					border-right: none;
					max-width: none;
				}
				
				.poll-header {
					flex-direction: column;
					gap: 10px;
				}
				
				.poll-close {
					align-self: flex-end;
				}
			}
		`;
		document.head.appendChild(style);
	}

	function registerFormattingButton() {
		// Guard against duplicate registration and race conditions
		if (buttonRegistered) { return; }
		buttonRegistered = true; // set immediately to avoid concurrent async registrations
		app.require('composer/formatting')
			.then((fmt) => {
				if (!fmt || typeof fmt.addButton !== 'function') {
					console.warn('Polls: formatting module not available');
					buttonRegistered = false; // allow retry later if formatting not available
					return;
				}
				// Dedupe: if any poll button already exists in a formatting bar, skip adding
				if (document.querySelector('.formatting-bar [data-format="poll"]')) {
					return;
				}
				fmt.addButton('fa fa-bar-chart', function onPollClick() {
					const composer = this; // postContainer
					addPollPanel(composer);
					togglePollPanel(composer);
				}, 'Add Poll', 'poll');
				// buttonRegistered remains true
			})
			.catch((err) => {
				console.warn('Polls: failed to load formatting', err);
				buttonRegistered = false; // allow retry later
			});
	}

	function addPollPanel(composer) {
		// Check if poll panel already exists
		if (composer.find('.poll-panel').length > 0) return;

		// Create poll panel HTML
		const pollPanel = $(`
			<div class="poll-panel" style="display: none; margin-top: 10px; padding: 20px; border: 1px solid #dee2e6; border-radius: 5px; background-color: #f8f9fa; min-height: auto; max-width: 600px; width: 100%;">
				<div class="poll-header d-flex justify-content-between align-items-center mb-3">
					<h6 class="mb-0">Create Poll</h6>
					<button type="button" class="btn btn-sm btn-outline-secondary poll-close" aria-label="Close">
						<i class="fa fa-times"></i>
					</button>
				</div>
				
				<div class="poll-form">
					<div class="mb-3">
						<label class="form-label">Poll Question</label>
						<input type="text" class="form-control poll-question" placeholder="Enter your poll question" maxlength="200">
						<div class="form-text poll-question-counter">0/200 characters</div>
					</div>
					
					<div class="poll-options">
						<label class="form-label">Options</label>
						<div class="poll-options-list">
							<div class="poll-option mb-2">
								<div class="input-group">
									<input type="text" class="form-control poll-option-input" placeholder="Option 1" maxlength="100">
									<button class="btn btn-outline-danger poll-remove-option" type="button" disabled>
										<i class="fa fa-minus"></i>
									</button>
								</div>
								<small class="text-muted poll-option-counter">0/100 characters</small>
							</div>
							<div class="poll-option mb-2">
								<div class="input-group">
									<input type="text" class="form-control poll-option-input" placeholder="Option 2" maxlength="100">
									<button class="btn btn-outline-danger poll-remove-option" type="button" disabled>
										<i class="fa fa-minus"></i>
									</button>
								</div>
								<small class="text-muted poll-option-counter">0/100 characters</small>
							</div>
						</div>
						
						<button type="button" class="btn btn-sm btn-outline-primary poll-add-option">
							<i class="fa fa-plus"></i> Add Option
						</button>
					</div>
					
					<div class="poll-validation mt-3" style="display: none;">
						<div class="alert alert-warning poll-validation-message" role="alert"></div>
					</div>
				</div>
			</div>
		`);

		// Insert poll panel after the write container
		const writeContainer = composer.find('.write-container');
		if (writeContainer.length > 0) {
			writeContainer.after(pollPanel);
		} else {
			// Fallback: insert after formatting bar
			composer.find('.formatting-bar').after(pollPanel);
		}

		setupPollPanelEvents(composer, pollPanel);
	}

	function setupPollPanelEvents(composer, pollPanel) {
		// Close poll panel
		pollPanel.find('.poll-close').on('click', function () {
			togglePollPanel(composer, false);
		});

		// Add option button
		pollPanel.find('.poll-add-option').on('click', function () {
			addPollOption(pollPanel);
		});

		// Remove option buttons
		pollPanel.on('click', '.poll-remove-option', function () {
			removePollOption($(this), pollPanel);
		});

		// Input validation and character counting
		pollPanel.on('input', '.poll-question', function () {
			const input = $(this);
			const counter = pollPanel.find('.poll-question-counter');
			const length = input.val().length;
			counter.text(length + '/200 characters');
			validatePoll(pollPanel);
		});

		pollPanel.on('input', '.poll-option-input', function () {
			const input = $(this);
			const counter = input.closest('.poll-option').find('.poll-option-counter');
			const length = input.val().length;
			counter.text(length + '/100 characters');
			validatePoll(pollPanel);
		});

		// Store poll data in composer for submission
		pollPanel.on('input', 'input', function () {
			storePollData(composer, pollPanel);
		});
	}

	function togglePollPanel(composer, show) {
		const pollPanel = composer.find('.poll-panel');
		const pollButton = composer.find('[data-format="poll"]');

		if (show === undefined) {
			show = !pollPanel.is(':visible');
		}

		if (show) {
			pollPanel.stop(true, true).slideDown({
				complete() {
					refreshPanelHeight(pollPanel);
				},
			});
			pollButton.addClass('active');
			refreshPanelHeight(pollPanel);
		} else {
			pollPanel.slideUp();
			pollButton.removeClass('active');
			clearPollData(composer);
		}
	}

	function addPollOption(pollPanel) {
		const optionsList = pollPanel.find('.poll-options-list');
		const currentOptions = optionsList.find('.poll-option').length;
		
		if (currentOptions >= 4) {
			showValidationMessage(pollPanel, 'Maximum 4 options allowed');
			return;
		}

		const newOption = $(`
			<div class="poll-option mb-2">
				<div class="input-group">
					<input type="text" class="form-control poll-option-input" placeholder="Option ${currentOptions + 1}" maxlength="100">
					<button class="btn btn-outline-danger poll-remove-option" type="button">
						<i class="fa fa-minus"></i>
					</button>
				</div>
				<small class="text-muted poll-option-counter">0/100 characters</small>
			</div>
		`);

		optionsList.append(newOption);
		updateRemoveButtons(pollPanel);
		validatePoll(pollPanel);
		refreshPanelHeight(pollPanel);
		
		// Focus on the new input
		newOption.find('.poll-option-input').focus();
	}

	function removePollOption(button, pollPanel) {
		const option = button.closest('.poll-option');
		option.remove();
		updateRemoveButtons(pollPanel);
		updateOptionPlaceholders(pollPanel);
		validatePoll(pollPanel);
		refreshPanelHeight(pollPanel);
	}

	function updateRemoveButtons(pollPanel) {
		const options = pollPanel.find('.poll-option');
		const removeButtons = pollPanel.find('.poll-remove-option');
		
		// Disable remove buttons if only 2 options remain
		removeButtons.prop('disabled', options.length <= 2);
	}

	function updateOptionPlaceholders(pollPanel) {
		pollPanel.find('.poll-option-input').each(function (index) {
			$(this).attr('placeholder', 'Option ' + (index + 1));
		});
	}

	function validatePoll(pollPanel) {
		const question = pollPanel.find('.poll-question').val().trim();
		const options = pollPanel.find('.poll-option-input').map(function () {
			return $(this).val().trim();
		}).get();

		let isValid = true;
		let validationMessage = '';

		// Check question
		if (!question) {
			isValid = false;
			validationMessage = 'Poll question is required';
		}

		// Check options
		const nonEmptyOptions = options.filter(opt => opt.length > 0);
		if (nonEmptyOptions.length < 2) {
			isValid = false;
			validationMessage = 'At least 2 options are required';
		}

		// Check for empty options between filled ones
		if (options.length > nonEmptyOptions.length && nonEmptyOptions.length >= 2) {
			let hasEmptyBetweenFilled = false;
			for (let i = 0; i < options.length; i++) {
				if (!options[i] && i < nonEmptyOptions.length) {
					hasEmptyBetweenFilled = true;
					break;
				}
			}
			if (hasEmptyBetweenFilled) {
				isValid = false;
				validationMessage = 'Empty options are not allowed';
			}
		}

		// Check for duplicate options
		const uniqueOptions = [...new Set(nonEmptyOptions)];
		if (uniqueOptions.length !== nonEmptyOptions.length) {
			isValid = false;
			validationMessage = 'Duplicate options are not allowed';
		}

		if (!isValid && validationMessage) {
			showValidationMessage(pollPanel, validationMessage);
		} else {
			hideValidationMessage(pollPanel);
		}

		return isValid;
	}

	function showValidationMessage(pollPanel, message) {
		const validation = pollPanel.find('.poll-validation');
		validation.find('.poll-validation-message').text(message);
		validation.show();
	}

	function hideValidationMessage(pollPanel) {
		pollPanel.find('.poll-validation').hide();
	}

	function storePollData(composer, pollPanel) {
		const question = pollPanel.find('.poll-question').val().trim();
		const options = pollPanel.find('.poll-option-input').map(function () {
			return $(this).val().trim();
		}).get().filter(opt => opt.length > 0);

		const isValid = validatePoll(pollPanel);
		
		if (isValid && question && options.length >= 2) {
			// Store poll data in composer data for submission
			const composerData = composer.data('poll') || {};
			composerData.question = question;
			composerData.options = options;
			composerData.enabled = true;
			composer.data('poll', composerData);
		} else {
			clearPollData(composer);
		}
	}

	function clearPollData(composer) {
		composer.removeData('poll');
	}

	function refreshPanelHeight(pollPanel) {
		// Force auto height and notify theme to recalc composer
		pollPanel.css({ height: 'auto', maxHeight: 'none' });
		$(window).trigger('action:composer.resize');
	}

	// Hook into the composer submit process
	hooks.on('filter:composer.submit', function (data) {
		const composer = data.composerEl;
		const pollData = composer.data('poll');
		
		if (pollData && pollData.enabled) {
			// Add poll data to the composer submission data
			data.composerData.poll = {
				question: pollData.question,
				options: pollData.options,
			};
		}
		
		return data;
	});

	// Show success message after successful post with poll
	hooks.on('action:composer.topics.post', function (data) {
		if (data.composerData && data.composerData.poll) {
			alerts.success('Announcement with poll created successfully!');
		}
	});

	hooks.on('action:composer.posts.reply', function (data) {
		if (data.composerData && data.composerData.poll) {
			alerts.success('Reply with poll created successfully!');
		}
	});

	return Polls;
});
