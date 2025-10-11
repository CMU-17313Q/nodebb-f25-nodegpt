{{{ if posts.poll }}}
<div component="post/poll" class="card mb-3 post-poll" data-poll-id="{posts.poll.id}">
    <div class="card-header">
        <h6 class="mb-0 fw-semibold">
            <i class="fa fa-pie-chart text-primary me-2"></i>
            {posts.poll.question}
        </h6>
    </div>
    <div class="card-body">
        {{{ if posts.poll.hasVoted }}}
        <!-- Poll results view (after voting) -->
        <div component="poll/results">
            {{{ each posts.poll.options }}}
            <div class="poll-option mb-3">
                <div class="d-flex justify-content-between mb-1">
                    <span class="poll-option-text {{{ if posts.poll.options.selected }}}fw-semibold text-primary{{{ end }}}">
                        {{{ if posts.poll.options.selected }}}<i class="fa fa-check me-1"></i>{{{ end }}}
                        {posts.poll.options.text}
                    </span>
                    <span class="poll-option-count text-muted">
                        {posts.poll.options.voteCount} {{{ if (posts.poll.options.voteCount == 1) }}}vote{{{ else }}}votes{{{ end }}} ({posts.poll.options.percentage}%)
                    </span>
                </div>
                <div class="progress" style="height: 6px;">
                    <div class="progress-bar {{{ if posts.poll.options.selected }}}bg-primary{{{ else }}}bg-secondary{{{ end }}}" 
                         style="width: {posts.poll.options.percentage}%"></div>
                </div>
            </div>
            {{{ end }}}
            <div class="poll-footer mt-3 pt-3 border-top">
                <small class="text-muted">
                    <i class="fa fa-users me-1"></i>
                    {posts.poll.totalVotes} {{{ if (posts.poll.totalVotes == 1) }}}vote{{{ else }}}votes{{{ end }}} total
                    {{{ if posts.poll.expiresAt }}}
                    • Ends <span class="timeago" title="{posts.poll.expiresAtISO}"></span>
                    {{{ end }}}
                </small>
            </div>
        </div>
        {{{ else }}}
        <!-- Poll voting view (before voting) -->
        <div component="poll/voting">
            <form component="poll/form">
                {{{ each posts.poll.options }}}
                <div class="form-check mb-2">
                    <input class="form-check-input" type="radio" name="pollOption" id="poll-option-{@index}" 
                           value="{@index}" data-option-id="{posts.poll.options.id}">
                    <label class="form-check-label" for="poll-option-{@index}">
                        {posts.poll.options.text}
                    </label>
                </div>
                {{{ end }}}
                <div class="d-flex gap-2 mt-3">
                    <button type="submit" component="poll/vote-btn" class="btn btn-primary btn-sm">
                        <i class="fa fa-check me-1"></i>
                        Vote
                    </button>
                    <small class="text-muted align-self-center">
                        {{{ if posts.poll.expiresAt }}}
                        Ends <span class="timeago" title="{posts.poll.expiresAtISO}"></span>
                        {{{ end }}}
                    </small>
                </div>
            </form>
            <div component="poll/message" class="alert alert-sm mt-2 d-none"></div>
        </div>
        {{{ end }}}
    </div>
</div>
{{{ end }}}