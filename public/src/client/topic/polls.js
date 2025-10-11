'use strict';

define('forum/topic/polls', ['api', 'alerts', 'bootbox', 'hooks'], function (api, alerts, bootbox, hooks) {
	const Polls = {};

	Polls.init = function () {
		addPollHandlers();
	};

	function addPollHandlers() {
		// Handle poll voting
		$('[component="topic"]').on('submit', '[component="poll/form"]', function (e) {
			e.preventDefault();
			const form = $(this);
			const pollContainer = form.closest('[component="post/poll"]');
			const pollId = pollContainer.attr('data-poll-id');
			const selectedOption = form.find('input[name="pollOption"]:checked');

			if (!selectedOption.length) {
				showPollMessage(pollContainer, 'Please select an option before voting.', 'warning');
				return;
			}

			const optionId = selectedOption.data('option-id');
			votePoll(pollId, optionId, pollContainer);
		});

		// Handle poll results toggle (if needed for future features)
		$('[component="topic"]').on('click', '[component="poll/results-toggle"]', function () {
			const pollContainer = $(this).closest('[component="post/poll"]');
			togglePollResults(pollContainer);
		});
	}

	function votePoll(pollId, optionId, pollContainer) {
		const voteBtn = pollContainer.find('[component="poll/vote-btn"]');
		const originalText = voteBtn.html();

		// Disable button and show loading
		voteBtn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin me-1"></i>Voting...');

		// For now, simulate the API call with hardcoded data
		// In a real implementation, this would be: api.post(`/posts/polls/${pollId}/vote`, { optionId })
		setTimeout(() => {
			// Simulate successful vote
			const mockPollData = generateMockPollResults(pollId, optionId);
			updatePollDisplay(pollContainer, mockPollData);
			showPollMessage(pollContainer, 'Your vote has been recorded!', 'success');

			// Re-enable button (though it won't be visible after update)
			voteBtn.prop('disabled', false).html(originalText);
		}, 500);
	}

	function generateMockPollResults(pollId, votedOptionId) {
		// This simulates what the backend would return
		// In reality, this data would come from the server
		const options = [
			{ id: 0, text: 'Option A', voteCount: 15, selected: votedOptionId === 0 },
			{ id: 1, text: 'Option B', voteCount: 8, selected: votedOptionId === 1 },
			{ id: 2, text: 'Option C', voteCount: 3, selected: votedOptionId === 2 },
		];

		// Increment vote count for selected option
		options[votedOptionId].voteCount += 1;

		const totalVotes = options.reduce((sum, option) => sum + option.voteCount, 0);

		// Calculate percentages
		options.forEach(option => {
			option.percentage = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
		});

		return {
			id: pollId,
			question: 'Sample Poll Question',
			options: options,
			totalVotes: totalVotes,
			hasVoted: true,
			expiresAt: null,
			expiresAtISO: null,
		};
	}

	function updatePollDisplay(pollContainer, pollData) {
		// Generate the results HTML
		let resultsHtml = '<div component="poll/results">';

		pollData.options.forEach(option => {
			resultsHtml += `
				<div class="poll-option mb-3">
					<div class="d-flex justify-content-between mb-1">
						<span class="poll-option-text ${option.selected ? 'fw-semibold text-primary' : ''}">
							${option.selected ? '<i class="fa fa-check me-1"></i>' : ''}
							${option.text}
						</span>
						<span class="poll-option-count text-muted">
							${option.voteCount} ${option.voteCount === 1 ? 'vote' : 'votes'} (${option.percentage}%)
						</span>
					</div>
					<div class="progress" style="height: 6px;">
						<div class="progress-bar ${option.selected ? 'bg-primary' : 'bg-secondary'}" 
							 style="width: ${option.percentage}%"></div>
					</div>
				</div>
			`;
		});

		resultsHtml += `
			<div class="poll-footer mt-3 pt-3 border-top">
				<small class="text-muted">
					<i class="fa fa-users me-1"></i>
					${pollData.totalVotes} ${pollData.totalVotes === 1 ? 'vote' : 'votes'} total
					${pollData.expiresAt ? `• Ends <span class="timeago" title="${pollData.expiresAtISO}"></span>` : ''}
				</small>
			</div>
		</div>`;

		// Replace the voting form with results
		pollContainer.find('.card-body').html(resultsHtml);

		// Update timeago elements if they exist
		pollContainer.find('.timeago').timeago();
	}

	function showPollMessage(pollContainer, message, type) {
		const messageEl = pollContainer.find('[component="poll/message"]');
		messageEl.removeClass('d-none alert-success alert-warning alert-danger alert-info')
			.addClass(`alert-${type}`)
			.text(message)
			.show();

		// Auto-hide success messages after 3 seconds
		if (type === 'success') {
			setTimeout(() => {
				messageEl.fadeOut();
			}, 3000);
		}
	}

	function togglePollResults() {
		// Future feature: toggle between detailed and simple results view
		// This is a placeholder for potential future enhancements
	}

	// Hook into post loading to initialize polls
	hooks.on('action:posts.loaded', function (data) {
		// Poll handlers are already bound to the topic container, so new posts will inherit them
		// Just ensure timeago is applied to any new polls
		data.posts.find('[component="post/poll"] .timeago').timeago();
	});

	return Polls;
});