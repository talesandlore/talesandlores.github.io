// Navigation functionality
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // Featured Videos Section
    const videoGrid = document.querySelector('.video-grid');
    if (videoGrid) {
        const videos = [
            {
                id: 'Gy_5ZRXU1P4',
                title: 'The Legend of the Nameless Warrior : Mulan'
            },
            {
                id: 'YPYiVVqwzGw',
                title: 'Stone Giants of New York'
            },
            {
                id: '8I8qn_z6CUs',
                title: 'The Viking Dream: Saga of Ragnar Lothbrok'
            },
            {
                id: 'XxVZGt0JVFk',
                title: 'Destruction of the Library of Alexandria: Lost Ancient Knowledge'
            },
            {
                id: 'coming-soon',
                title: 'Romulus: From Tragedy to Triumph : The Birth of Rome'
            }
        ];

        videoGrid.innerHTML = videos.map(video => `
            <div class="video-card">
                <div class="video-placeholder">
                    <iframe 
                        src="https://www.youtube.com/embed/${video.id}?rel=0&showinfo=0&modestbranding=1"
                        title="${video.title}"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen>
                    </iframe>
                </div>
                <h3>${video.title}</h3>
            </div>
        `).join('');
    }
    }

    // Story functionality
    const modal = document.getElementById('storyModal');
    const shareBtn = document.querySelector('.share-story-btn');
    const closeBtn = document.querySelector('.close-modal');
    const storyForm = document.getElementById('storyForm');

    if (modal && shareBtn && closeBtn && storyForm) {
        // Modal controls
        shareBtn.addEventListener('click', () => modal.style.display = 'block');
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        // Form submission
        storyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const story = {
                title: document.getElementById('storyTitle').value,
                category: document.getElementById('storyCategory').value,
                content: document.getElementById('storyContent').value,
                author: 'Anonymous'
            };

            try {
                const { error } = await supabase.from('stories').insert([story]);
                if (error) throw error;

                alert('Story submitted successfully!');
                modal.style.display = 'none';
                storyForm.reset();
                loadStories();
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to submit story');
            }
        });
    }

    // Handle story interactions
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('read-more')) {
            e.preventDefault();
            const storyId = e.target.dataset.storyId;
            await showFullStory(storyId);
        }
    });

    // Load initial stories
    loadStories();
});

// Story-related functions
async function loadStories() {
    const { data, error } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading stories:', error);
        return;
    }
    
    displayStories(data);
}

function displayStories(stories) {
    const storyGrid = document.querySelector('.story-grid');
    if (!storyGrid) return;

    storyGrid.innerHTML = stories.map(story => `
        <div class="story-card">
            <div class="story-header">
                <img src="images/default-avatar.png" alt="User Avatar" class="author-avatar">
                <div class="story-meta">
                    <h3>${story.title}</h3>
                    <p class="author">By ${story.author}</p>
                    <span class="category">${story.category}</span>
                </div>
            </div>
            <p class="story-excerpt">${story.content.substring(0, 150)}...</p>
            <div class="story-footer">
                <span class="date">${new Date(story.created_at).toLocaleDateString()}</span>
                <a href="#" class="read-more" data-story-id="${story.id}">Read More</a>
            </div>
        </div>
    `).join('');
}

async function showFullStory(storyId) {
    const { data: story, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();

    if (error) {
        console.error('Error loading story:', error);
        return;
    }

    const fullStoryModal = document.getElementById('fullStoryModal');
    if (!fullStoryModal) return;

    document.getElementById('fullStoryTitle').textContent = story.title;
    document.getElementById('fullStoryAuthor').textContent = `By ${story.author}`;
    document.getElementById('fullStoryCategory').textContent = story.category;
    document.getElementById('fullStoryDate').textContent = new Date(story.created_at).toLocaleDateString();
    document.getElementById('fullStoryText').textContent = story.content;

    // Update reaction counts
    document.querySelector('[data-type="likes"] .reaction-count').textContent = story.likes || 0;
    document.querySelector('[data-type="loves"] .reaction-count').textContent = story.loves || 0;
    document.querySelector('[data-type="inspires"] .reaction-count').textContent = story.inspires || 0;

    // Add reaction click handlers
    document.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.onclick = () => handleReaction(storyId, btn.dataset.type);
    });

    // Handle comment submission
    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.onsubmit = async (e) => {
            e.preventDefault();
            const content = e.target.querySelector('textarea').value;
            if (await submitComment(storyId, content)) {
                e.target.reset();
                await loadComments(storyId);
            }
        };
    }

    // Load existing comments
    await loadComments(storyId);
    
    fullStoryModal.style.display = 'block';

    // Close modal handler
    const closeFullStory = document.getElementById('closeFullStory');
    if (closeFullStory) {
        closeFullStory.onclick = () => fullStoryModal.style.display = 'none';
    }
}

async function handleReaction(storyId, reactionType) {
    const { data, error } = await supabase
        .from('stories')
        .select(reactionType)
        .eq('id', storyId)
        .single();
    
    if (error) {
        console.error('Error:', error);
        return;
    }

    const newCount = data[reactionType] + 1;

    const { error: updateError } = await supabase
        .from('stories')
        .update({ [reactionType]: newCount })
        .eq('id', storyId);

    if (!updateError) {
        document.querySelector(`[data-type="${reactionType}"] .reaction-count`).textContent = newCount;
        document.querySelector(`[data-type="${reactionType}"]`).classList.add('active');
    }
}

async function loadComments(storyId) {
    const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('story_id', storyId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading comments:', error);
        return;
    }

    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;

    commentsList.innerHTML = comments.map(comment => `
        <div class="comment">
            <div class="comment-header">
                <span class="comment-author">${comment.author}</span>
                <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
            </div>
            <div class="comment-content">${comment.content}</div>
        </div>
    `).join('');
}

async function submitComment(storyId, content) {
    const { error } = await supabase
        .from('comments')
        .insert([{
            story_id: storyId,
            content: content,
            author: 'Anonymous'
        }]);

    if (error) {
        console.error('Error submitting comment:', error);
        return false;
    }
    return true;
}