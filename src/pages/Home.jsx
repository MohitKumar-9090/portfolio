
import { useEffect, useRef, useState } from 'react';
import emailjs from '@emailjs/browser';
import { jsPDF } from 'jspdf';
import '../styles/portfolio.css';
import PROFILE_FIXED from '../assets/profile-fixed.jpg';
import COVER_FIXED from '../assets/cover-fixed.png';
import { incrementResumeDownload } from '../services/insights';
import { db, firebase } from '../lib/firebase';

const DEFAULT_PROFILE = PROFILE_FIXED;
const DEFAULT_COVER = COVER_FIXED;
const IBM_LOGO =
  'https://yt3.googleusercontent.com/dhVlUr4qzdw97K77mitoVSZk8u3KLl4hWCeiAVNuoqG1W7WmcN86GSIl96Ge1PeauemTwCl5TA=s900-c-k-c0x00ffffff-no-rj';
const CHAT_API_BASE = (
  import.meta.env.VITE_CHAT_API_URL || 'https://portfolio-n4ko.onrender.com'
).replace(/\/$/, '');
const PROJECTS_DOC = db.collection('portfolio').doc('projects');
const PROJECT_ADD_PASSWORD = '8579013444';
const DEFAULT_PROJECTS = [
  {
    id: 'p1',
    title: 'AI Resume Analyzer',
    category: 'AI / ML',
    description:
      'Resume screening tool that extracts skills and matches candidates with role-specific requirements.',
    stack: ['Python', 'NLP', 'Flask', 'React'],
    webLink: 'https://dulcet-conkies-95e6f3.netlify.app/',
    codeLink: 'https://github.com/MohitKumar-9090/ai-resume.anylzer.git',
    image:
      'https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'p2',
    title: 'Smart Attendance System',
    category: 'Full Stack',
    description:
      'Face-recognition based attendance app with admin dashboard, attendance history, and analytics.',
    stack: ['React', 'Firebase', 'OpenCV'],
    webLink: '',
    codeLink: 'https://github.com/',
    image:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
  },
];

const normalizeProject = (project = {}) => {
  const title = (project.title || '').trim();
  const legacyLink = (project.link || '').trim();
  let webLink = (project.webLink || '').trim();
  let codeLink = (project.codeLink || legacyLink).trim();

  if (title === 'AI Resume Analyzer') {
    webLink = webLink || 'https://dulcet-conkies-95e6f3.netlify.app/';
    if (!codeLink || codeLink === webLink) {
      codeLink = 'https://github.com/MohitKumar-9090/ai-resume.anylzer.git';
    }
  }

  return {
    ...project,
    stack: Array.isArray(project.stack) ? project.stack : [],
    webLink,
    codeLink,
  };
};

function Home() {
  const skillsRef = useRef(null);

  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewMessage, setReviewMessage] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [profileImgSrc] = useState(DEFAULT_PROFILE);
  const [coverImgSrc] = useState(DEFAULT_COVER);

  const [reviewName, setReviewName] = useState('');
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [projects, setProjects] = useState(() =>
    DEFAULT_PROJECTS.map((project) => normalizeProject(project))
  );
  const [projectsHydrated, setProjectsHydrated] = useState(false);
  const [projectAccessGranted, setProjectAccessGranted] = useState(false);
  const [projectMessage, setProjectMessage] = useState(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    category: 'Web App',
    description: '',
    stack: '',
    webLink: '',
    codeLink: '',
    image: '',
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: 'Hello! I am Mohit\'s AI portfolio assistant. Feel free to ask anything.',
    },
  ]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    emailjs.init('5Ndj6lBpf_A8T-UX9');
  }, []);

  useEffect(() => {
    let active = true;

    const loadProjects = async () => {
      let loadedFromDatabase = false;

      try {
        const snapshot = await PROJECTS_DOC.get();
        const dbProjects = snapshot.data()?.items;
        if (Array.isArray(dbProjects)) {
          loadedFromDatabase = true;
          if (active) {
            setProjects(dbProjects.map((project) => normalizeProject(project)));
          }
        }
      } catch {
        loadedFromDatabase = false;
      }

      if (!loadedFromDatabase) {
        const savedProjects = localStorage.getItem('portfolio_projects');
        if (savedProjects) {
          try {
            const parsed = JSON.parse(savedProjects);
            if (Array.isArray(parsed) && parsed.length > 0 && active) {
              setProjects(parsed.map((project) => normalizeProject(project)));
            }
          } catch {
            if (active) {
              setProjects(DEFAULT_PROJECTS.map((project) => normalizeProject(project)));
            }
          }
        }
      }

      if (active) {
        setProjectsHydrated(true);
      }
    };

    loadProjects();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!projectsHydrated) return;

    localStorage.setItem('portfolio_projects', JSON.stringify(projects));

    const syncProjectsToDatabase = async () => {
      try {
        await PROJECTS_DOC.set(
          {
            items: projects,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch {
        // localStorage fallback already keeps projects persistent for this browser
      }
    };

    syncProjectsToDatabase();
  }, [projects, projectsHydrated]);

  useEffect(() => {
    if (!projectModalOpen) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setProjectModalOpen(false);
        setProjectAccessGranted(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [projectModalOpen]);

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!skillsRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const skillBars =
              skillsRef.current?.querySelectorAll('.skill-progress') || [];
            skillBars.forEach((bar) => {
              const width = bar.getAttribute('data-width') || '0';
              bar.style.width = `${width}%`;
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(skillsRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!chatOpen) return;
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  const showMessage = (text, type) => {
    setReviewMessage({ text, type });
    setTimeout(() => setReviewMessage(null), 5000);
  };

  const showProjectMessage = (text, type) => {
    setProjectMessage({ text, type });
    setTimeout(() => setProjectMessage(null), 4000);
  };

  const closeProjectModal = () => {
    setProjectModalOpen(false);
    setProjectAccessGranted(false);
  };

  const openProjectModalWithPassword = () => {
    const enteredPassword = window.prompt('Enter password to add a project:');
    if (enteredPassword === null) return;

    if (enteredPassword.trim() !== PROJECT_ADD_PASSWORD) {
      showProjectMessage('Invalid password. Project add access denied.', 'error');
      return;
    }

    setProjectAccessGranted(true);
    setProjectModalOpen(true);
  };

  const buildPortfolioData = () => ({
    identity: {
      officialName: 'Mohit Kumar',
      publicName: 'Mohit Pandey',
      education: 'B.Tech CSE (AI-ML Associate with IBM)',
      year: '1st Year Student',
      university: 'Rungta International Skill University',
      location: 'Bihar, India',
    },
    about:
      'Computer Science Engineering student specializing in AI and ML, focused on building real-world intelligent solutions.',
    skills: [
      'Java',
      'C',
      'Python',
      'SQL',
      'Data Structures and Algorithms',
      'HTML',
      'CSS',
      'JavaScript',
      'React',
      'Artificial Intelligence',
      'Machine Learning',
    ],
    projects: projects.map((project) => ({
      title: project.title,
      category: project.category,
      description: project.description,
      stack: project.stack,
      link: project.webLink || project.codeLink || project.link || '',
    })),
    contact: {
      phone: '7667615747',
      emails: ['mohit.pandey@rungta.org', 'mk9658173@gmail.com'],
    },
  });

  const handleDownloadResume = async () => {
    incrementResumeDownload();
    const data = buildPortfolioData();
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 36;
    const headerHeight = 165;
    const gap = 20;
    const leftColWidth = 175;
    const rightColX = margin + leftColWidth + gap;
    const rightColWidth = pageWidth - rightColX - margin;
    let leftY = headerHeight + 24;
    let rightY = headerHeight + 24;

    const toDataUrl = async (src) => {
      const res = await fetch(src);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    const addSectionTitle = (text, x, y) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(79, 70, 229);
      doc.text(text.toUpperCase(), x, y);
      doc.setDrawColor(203, 213, 225);
      doc.line(x, y + 8, x + (x === margin ? leftColWidth : rightColWidth), y + 8);
      return y + 24;
    };

    const addWrappedText = (text, x, y, width, options = {}) => {
      const {
        fontSize = 10.5,
        fontStyle = 'normal',
        color = [51, 65, 85],
        lineGap = 15,
      } = options;
      const value = String(text || '').trim();
      if (!value) return y;
      const lines = doc.splitTextToSize(value, width);
      doc.setFont('helvetica', fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(lines, x, y);
      return y + lines.length * lineGap;
    };

    const name = data?.identity?.officialName || data?.identity?.publicName || 'Mohit Kumar';
    const role = data?.identity?.education || 'B.Tech CSE (AI & ML)';
    const location = data?.identity?.location || '';
    const emails = Array.isArray(data?.contact?.emails) ? data.contact.emails : [];
    const phone = data?.contact?.phone || '';

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    doc.setFillColor(79, 70, 229);
    doc.rect(0, headerHeight - 12, pageWidth, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(30);
    doc.text(name, margin, 58);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text(role, margin, 84);
    doc.setFontSize(10.5);
    doc.setTextColor(226, 232, 240);
    doc.text([location, phone, emails[0] || ''].filter(Boolean).join('  |  '), margin, 106);

    try {
      const imageData = await toDataUrl(profileImgSrc);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth - margin - 88, 28, 88, 88, 10, 10, 'F');
      doc.addImage(imageData, 'JPEG', pageWidth - margin - 84, 32, 80, 80);
    } catch {
      // Resume still downloads even if image conversion fails.
    }

    // Left column
    leftY = addSectionTitle('Education', margin, leftY);
    leftY = addWrappedText(`${data?.identity?.education || 'B.Tech CSE'}`, margin, leftY, leftColWidth, {
      fontStyle: 'bold',
      fontSize: 10.5,
    });
    leftY = addWrappedText(`${data?.identity?.year || ''}`, margin, leftY + 2, leftColWidth, {
      fontSize: 10,
      color: [71, 85, 105],
    });
    leftY = addWrappedText(`${data?.identity?.university || ''}`, margin, leftY + 2, leftColWidth, {
      fontSize: 10,
      color: [71, 85, 105],
    });

    leftY = addSectionTitle('Skills', margin, leftY + 12);
    (data?.skills || []).slice(0, 14).forEach((skill) => {
      leftY = addWrappedText(`- ${skill}`, margin, leftY, leftColWidth, {
        fontSize: 10,
        color: [51, 65, 85],
      });
    });

    leftY = addSectionTitle('Contact & Links', margin, leftY + 12);
    leftY = addWrappedText(`Phone: ${phone}`, margin, leftY, leftColWidth, { fontSize: 10 });
    leftY = addWrappedText(`Email: ${emails[0] || ''}`, margin, leftY, leftColWidth, { fontSize: 10 });
    leftY = addWrappedText('LinkedIn:', margin, leftY + 4, leftColWidth, {
      fontSize: 10,
      fontStyle: 'bold',
    });
    leftY = addWrappedText('linkedin.com/in/mohit-kumar-391838346', margin, leftY, leftColWidth, {
      fontSize: 9.5,
      color: [79, 70, 229],
    });
    leftY = addWrappedText('GitHub:', margin, leftY + 4, leftColWidth, {
      fontSize: 10,
      fontStyle: 'bold',
    });
    addWrappedText('github.com/MohitKumar-9090', margin, leftY, leftColWidth, {
      fontSize: 9.5,
      color: [79, 70, 229],
    });

    // Right column
    rightY = addSectionTitle('Professional Summary', rightColX, rightY);
    rightY = addWrappedText(
      data?.about ||
        'Technically driven Computer Science student focused on AI/ML and full-stack development.',
      rightColX,
      rightY,
      rightColWidth,
      { fontSize: 11, color: [51, 65, 85], lineGap: 16 }
    );

    rightY = addSectionTitle('Projects', rightColX, rightY + 10);
    (data?.projects || []).slice(0, 5).forEach((project) => {
      const title = [project?.title, project?.category ? `(${project.category})` : '']
        .filter(Boolean)
        .join(' ');
      rightY = addWrappedText(title, rightColX, rightY, rightColWidth, {
        fontStyle: 'bold',
        fontSize: 11,
        color: [30, 41, 59],
      });
      rightY = addWrappedText(project?.description || '', rightColX, rightY + 1, rightColWidth, {
        fontSize: 10.5,
        color: [71, 85, 105],
      });
      if (Array.isArray(project?.stack) && project.stack.length > 0) {
        rightY = addWrappedText(`Tech: ${project.stack.join(', ')}`, rightColX, rightY + 1, rightColWidth, {
          fontSize: 9.8,
          color: [100, 116, 139],
        });
      }
      if (project?.link) {
        rightY = addWrappedText(`Link: ${project.link}`, rightColX, rightY + 1, rightColWidth, {
          fontSize: 9.6,
          color: [79, 70, 229],
        });
      }
      rightY += 8;
    });

    doc.save('Mohit_Kumar_Resume.pdf');
  };

  const handleSendChat = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    const userMessage = { id: `u-${Date.now()}`, role: 'user', text: message };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      if (!CHAT_API_BASE) {
        throw new Error('Chat backend is not configured.');
      }

      const portfolioData = buildPortfolioData();
      const response = await fetch(`${CHAT_API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          prompt: message,
          portfolioData,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Chat request failed with status ${response.status}`);
      }

      const aiText = (data?.reply || '').trim();
      if (!aiText) throw new Error('Empty response from chat backend.');

      setChatMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: aiText },
      ]);
    } catch (error) {
      const errorText = error?.message || 'Unknown error';
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `I am sorry, chat is unavailable right now. ${errorText}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleProjectInput = (event) => {
    const { name, value } = event.target;
    setProjectForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddProject = (event) => {
    event.preventDefault();

    if (!projectAccessGranted) {
      showProjectMessage('Please enter valid password before adding a project.', 'error');
      closeProjectModal();
      return;
    }

    if (!projectForm.title.trim() || !projectForm.description.trim()) {
      showProjectMessage('Title and description are required.', 'error');
      return;
    }

    const stackItems = projectForm.stack
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const newProject = {
      id: `p-${Date.now()}`,
      title: projectForm.title.trim(),
      category: projectForm.category.trim() || 'Web App',
      description: projectForm.description.trim(),
      stack: stackItems,
      webLink: projectForm.webLink.trim(),
      codeLink: projectForm.codeLink.trim(),
      image: projectForm.image.trim(),
    };

    setProjects((prev) => [normalizeProject(newProject), ...prev]);
    closeProjectModal();
    setProjectForm({
      title: '',
      category: 'Web App',
      description: '',
      stack: '',
      webLink: '',
      codeLink: '',
      image: '',
    });
    showProjectMessage('Project added successfully.', 'success');
  };

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      if (!CHAT_API_BASE) {
        throw new Error('Review backend is not configured.');
      }

      const response = await fetch(`${CHAT_API_BASE}/api/reviews`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Failed to load reviews (${response.status}).`);
      }

      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
    } catch (error) {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    if (selectedRating === 0) {
      showMessage('Please select a star rating.', 'error');
      return;
    }

    if (!reviewName.trim() || !reviewEmail.trim() || !reviewText.trim()) {
      showMessage('Please fill in all fields.', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      if (!CHAT_API_BASE) {
        throw new Error('Review backend is not configured.');
      }

      const response = await fetch(`${CHAT_API_BASE}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: reviewName.trim(),
          email: reviewEmail.trim(),
          rating: selectedRating,
          message: reviewText.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Failed to submit review (${response.status}).`);
      }

      try {
        const templateParams = {
          from_name: reviewName.trim(),
          from_email: reviewEmail.trim(),
          rating: selectedRating,
          message: reviewText.trim(),
          to_email: 'mk9658173@gmail.com',
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
        };

        await emailjs.send('service_i33cgsc', 'template_56l3tdt', templateParams);
      } catch (emailError) {
        // Email failure should not block submission
      }

      showMessage('Review submitted successfully! Thank you for your feedback.', 'success');
      setReviewName('');
      setReviewEmail('');
      setReviewText('');
      setSelectedRating(0);
      setHoverRating(0);
      loadReviews();
    } catch (error) {
      showMessage(error?.message || 'Error submitting review. Please try again.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      if (!CHAT_API_BASE) {
        throw new Error('Review backend is not configured.');
      }

      const response = await fetch(`${CHAT_API_BASE}/api/reviews/${reviewId}/hide`, {
        method: 'PATCH',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Failed to delete review (${response.status}).`);
      }

      showMessage('Review deleted successfully.', 'success');
      loadReviews();
    } catch (error) {
      showMessage(error?.message || 'Error deleting review.', 'error');
    }
  };

  const renderStars = (rating) => {
    const stars = Array.from({ length: 5 }).map((_, idx) => {
      const active = idx < rating;
      return (
        <i
          key={`star-${rating}-${idx}`}
          className={`fa-${active ? 'solid' : 'regular'} fa-star`}
        ></i>
      );
    });
    return <div className="review-stars">{stars}</div>;
  };

  const displayRating = hoverRating || selectedRating;

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
        <div className="container nav-container">
          <a href="#home" className="logo">
            <img
              src="https://ui-avatars.com/api/?name=MP&size=40&background=6366f1&color=fff&bold=true"
              alt="MP Logo"
              className="logo-img"
            />
            <span>Mohit Pandey</span>
          </a>

          <button
            type="button"
            className="mobile-toggle"
            id="mobileToggle"
            onClick={() => setNavOpen((open) => !open)}
          >
            <i className={`fas ${navOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>

          <ul className={`nav-links ${navOpen ? 'active' : ''}`} id="navLinks">
            <li>
              <a href="#home" onClick={() => setNavOpen(false)}>
                Home
              </a>
            </li>
            <li>
              <a href="#about" onClick={() => setNavOpen(false)}>
                About
              </a>
            </li>
            <li>
              <a href="#skills" onClick={() => setNavOpen(false)}>
                Skills
              </a>
            </li>
            <li>
              <a href="#projects" onClick={() => setNavOpen(false)}>
                Projects
              </a>
            </li>
            <li>
              <a href="#reviews" onClick={() => setNavOpen(false)}>
                Reviews
              </a>
            </li>
            <li>
              <a href="#contact" onClick={() => setNavOpen(false)}>
                Contact
              </a>
            </li>
            <li>
              <a href="/dashboard" onClick={() => setNavOpen(false)}>
                Dashboard
              </a>
            </li>
          </ul>

        </div>
      </nav>

      <section id="home" className="hero">
        <div className="profile-card">
          <div className="cover-section">
            <img src={coverImgSrc} alt="Cover Photo" className="cover-image" />
          </div>

          <div className="profile-photo-section">
            <div className="profile-photo-container">
              <img src={profileImgSrc} alt="Mohit Pandey" className="profile-image" />
            </div>
          </div>

          <div className="profile-info">
            <div className="profile-header">
              <h1>Mohit Pandey</h1>
              <div className="profile-title">
                <p>B.Tech CSE (AI & ML) | IBM Associate</p>
                <p className="location">Motihari, Bihar, India</p>
              </div>
            </div>

            <div className="profile-details">
              <div className="detail-item">
                <i className="fas fa-envelope"></i>
                <span>mk9658173@gmail.com</span>
              </div>
              <div className="detail-item">
                <i className="fas fa-phone"></i>
                <span>+91 7667615747</span>
              </div>
            </div>

            <div className="hero-cta">
              <button type="button" className="btn btn-primary resume-btn" onClick={handleDownloadResume}>
                <i className="fas fa-download"></i> Download Resume
              </button>
            </div>

            <div className="floating-badges">
              <div className="badge badge-ibm">
                <div className="badge-icon">
                  <img src={IBM_LOGO} alt="IBM Logo" />
                </div>
                <div className="badge-content">
                  <strong>IBM Certified</strong>
                  <p>Academic Associate</p>
                </div>
              </div>

              <div className="badge badge-education">
                <div className="badge-icon">
                  <i className="fas fa-graduation-cap"></i>
                </div>
                <div className="badge-content">
                  <strong>B.Tech CSE</strong>
                  <p>AI & ML Specialization</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="section-bg">
        <div className="container">
          <div className="section-title">
            <h2>About Me</h2>
            <p>Passionate developer with a focus on AI/ML and modern web technologies</p>
          </div>

          <div className="about-content">
            <div className="about-text">
              <h3>Transforming Ideas into Intelligent Solutions</h3>
              <p>
                I&apos;m a Computer Science Engineering student specializing in
                Artificial Intelligence and Machine Learning. My journey in
                technology began with curiosity and has evolved into a passion
                for creating innovative solutions that solve real-world problems.
              </p>
              <p>
                With expertise in both frontend and backend development, I build
                comprehensive applications that are not only visually appealing
                but also robust and scalable. My IBM certification has provided
                me with industry-relevant skills and a deeper understanding of
                enterprise-level development practices.
              </p>

              <div className="about-stats">
                <div className="stat-item">
                  <div className="stat-number">20+</div>
                  <div className="stat-label">Projects</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">5+</div>
                  <div className="stat-label">Technologies</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">100%</div>
                  <div className="stat-label">Dedication</div>
                </div>
              </div>
            </div>

            <div className="about-image">
              <img
                src="https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                alt="About Mohit"
                className="about-img"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="skills" ref={skillsRef}>
        <div className="container">
          <div className="section-title">
            <h2>Technical Skills</h2>
            <p>Mastering the tools and technologies that power modern applications</p>
          </div>

          <div className="skills-container">
            <div className="skill-category">
              <h3>
                <i className="fas fa-code"></i> Programming
              </h3>
              <div className="skill-list">
                <div className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">Python</span>
                    <span className="skill-percent">95%</span>
                  </div>
                  <div className="skill-bar">
                    <div className="skill-progress" data-width="95"></div>
                  </div>
                </div>
                <div className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">JavaScript</span>
                    <span className="skill-percent">90%</span>
                  </div>
                  <div className="skill-bar">
                    <div className="skill-progress" data-width="90"></div>
                  </div>
                </div>
                <div className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">C</span>
                    <span className="skill-percent">85%</span>
                  </div>
                  <div className="skill-bar">
                    <div className="skill-progress" data-width="85"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="skill-category">
              <h3>
                <i className="fas fa-layer-group"></i> Web Technologies
              </h3>
              <div className="skill-list">
                <div className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">HTML/CSS</span>
                    <span className="skill-percent">98%</span>
                  </div>
                  <div className="skill-bar">
                    <div className="skill-progress" data-width="98"></div>
                  </div>
                </div>
                <div className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">React</span>
                    <span className="skill-percent">80%</span>
                  </div>
                  <div className="skill-bar">
                    <div className="skill-progress" data-width="80"></div>
                  </div>
                </div>
                <div className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">Node.js</span>
                    <span className="skill-percent">75%</span>
                  </div>
                  <div className="skill-bar">
                    <div className="skill-progress" data-width="75"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="skill-category">
              <h3>
                <i className="fas fa-database"></i> Tools & Platforms
              </h3>
              <div className="skill-list">
                <div className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">Firebase</span>
                    <span className="skill-percent">88%</span>
                  </div>
                  <div className="skill-bar">
                    <div className="skill-progress" data-width="88"></div>
                  </div>
                </div>
                <div className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">Git</span>
                    <span className="skill-percent">92%</span>
                  </div>
                  <div className="skill-bar">
                    <div className="skill-progress" data-width="92"></div>
                  </div>
                </div>
                <div className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">AWS</span>
                    <span className="skill-percent">70%</span>
                  </div>
                  <div className="skill-bar">
                    <div className="skill-progress" data-width="70"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="projects" className="section-bg projects-section">
        <div className="container">
          <div
            className="section-title projects-title"
            role="button"
            tabIndex={0}
            onClick={openProjectModalWithPassword}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openProjectModalWithPassword();
              }
            }}
          >
            <h2>Projects</h2>
            <p>Modern showcase of AI/ML, web apps, and full-stack builds</p>
            <span className="projects-hint">
              <i className="fas fa-plus-circle"></i> Click here to add project
            </span>
          </div>

          {projectMessage && (
            <div className={`message ${projectMessage.type}`}>{projectMessage.text}</div>
          )}

          <div className="projects-toolbar">
            <button className="btn btn-primary" onClick={openProjectModalWithPassword}>
              <i className="fas fa-plus"></i> Add Project
            </button>
          </div>

          <div className="projects-grid">
            {projects.map((project) => {
              const webLink = (project.webLink || '').trim();
              const codeLink = (project.codeLink || project.link || '').trim();
              const hasPosterLink = Boolean(webLink);
              const hasAnyLink = Boolean(webLink || codeLink);

              return (
                <article className="project-card" key={project.id}>
                  <a
                    href={webLink || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className={`project-thumb ${!hasPosterLink ? 'disabled' : ''}`}
                    onClick={(event) => {
                      if (!hasPosterLink) {
                        event.preventDefault();
                      }
                    }}
                    aria-label={`Open ${project.title} web page`}
                  >
                    {project.image ? (
                      <img src={project.image} alt={project.title} />
                    ) : (
                      <div className="project-thumb-fallback">
                        <i className="fas fa-code"></i>
                      </div>
                    )}
                    <span className="project-category">{project.category}</span>
                  </a>
                  <div className="project-body">
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                    <div className="project-stack">
                      {project.stack.length > 0 ? (
                        project.stack.map((item) => (
                          <span key={`${project.id}-${item}`} className="project-tag">
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="project-tag">General</span>
                      )}
                    </div>
                    <details className={`project-options ${!hasAnyLink ? 'disabled' : ''}`}>
                      <summary
                        className={`project-link ${!hasAnyLink ? 'disabled' : ''}`}
                        onClick={(event) => {
                          if (!hasAnyLink) {
                            event.preventDefault();
                          }
                        }}
                      >
                        View Project <i className="fas fa-arrow-right"></i>
                      </summary>
                      <div className="project-options-menu">
                        <a
                          href={webLink || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className={!webLink ? 'disabled' : ''}
                          onClick={(event) => {
                            if (!webLink) {
                              event.preventDefault();
                            }
                          }}
                        >
                          Web Page
                        </a>
                        <a
                          href={codeLink || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className={!codeLink ? 'disabled' : ''}
                          onClick={(event) => {
                            if (!codeLink) {
                              event.preventDefault();
                            }
                          }}
                        >
                          Code
                        </a>
                      </div>
                    </details>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="reviews">
        <div className="container">
          <div className="section-title">
            <h2>Client Reviews</h2>
            <p>What people say about my work and collaboration</p>
          </div>

          <div className="reviews-container">
            <div className="review-form" id="reviewFormContainer">
              <h3 style={{ marginBottom: '1.5rem' }}>Share Your Experience</h3>

              {reviewMessage && (
                <div className={`message ${reviewMessage.type}`}>
                  <i
                    className={`fas fa-${
                      reviewMessage.type === 'success' ? 'check-circle' : 'exclamation-circle'
                    }`}
                  ></i>{' '}
                  {reviewMessage.text}
                </div>
              )}

              <form id="reviewForm" onSubmit={handleReviewSubmit}>
                  <div className="form-group">
                    <label htmlFor="reviewerName" className="form-label">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      id="reviewerName"
                      className="form-input"
                      placeholder="Enter your name"
                      required
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reviewerEmail" className="form-label">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="reviewerEmail"
                      className="form-input"
                      placeholder="Enter your email"
                      required
                      value={reviewEmail}
                      onChange={(e) => setReviewEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Rating *</label>
                    <div
                      className="star-rating"
                      id="starRating"
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const ratingValue = idx + 1;
                        const active = ratingValue <= displayRating;
                        return (
                          <span
                            key={`rate-${ratingValue}`}
                            className={`star ${active ? 'active' : ''}`}
                            onClick={() => setSelectedRating(ratingValue)}
                            onMouseEnter={() => setHoverRating(ratingValue)}
                          >
                            <i
                              className={`fa-${active ? 'solid' : 'regular'} fa-star`}
                            ></i>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="reviewText" className="form-label">
                      Your Review *
                    </label>
                    <textarea
                      id="reviewText"
                      className="form-textarea"
                      rows="4"
                      placeholder="Share your thoughts about my work..."
                      required
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={submittingReview}
                  >
                    {submittingReview ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i> Submitting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i> Submit Review
                      </>
                    )}
                  </button>
              </form>
            </div>

            <div className="reviews-list" id="reviewsList">
              {reviewsLoading && (
                <div className="loading">
                  <i className="fas fa-spinner fa-spin"></i> Loading reviews...
                </div>
              )}

              {!reviewsLoading && reviews.length === 0 && (
                <div className="message info">No reviews yet. Be the first to leave one!</div>
              )}

              {!reviewsLoading &&
                reviews.map(({ id, data }) => {
                  const date = data.timestampMs
                    ? new Date(data.timestampMs).toLocaleDateString()
                    : 'Recently';

                  return (
                    <div className="review-card" key={id}>
                      <div className="review-header">
                        <div className="reviewer-info">
                          <h4>{data.name}</h4>
                          <div className="reviewer-email">
                            {data.email} • {date}
                          </div>
                        </div>
                        <div>
                          {renderStars(data.rating)}
                          <div className="review-actions">
                            <button
                              type="button"
                              className="delete-review"
                              onClick={() => handleDeleteReview(id)}
                            >
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                      <p>{data.message}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </section>
      <section id="contact" className="section-bg">
        <div className="container">
          <div className="section-title">
            <h2>Get In Touch</h2>
            <p>Let&apos;s collaborate on your next project</p>
          </div>

          <div className="contact-container">
            <div className="contact-info">
              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fas fa-map-marker-alt"></i>
                </div>
                <div>
                  <h4>Location</h4>
                  <p>Motihari, Bihar, India</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div>
                  <h4>Email</h4>
                  <p>mk9658173@gmail.com</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fas fa-phone"></i>
                </div>
                <div>
                  <h4>Phone</h4>
                  <p>+91 7667615747</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fas fa-graduation-cap"></i>
                </div>
                <div>
                  <h4>Education</h4>
                  <p>B.Tech CSE (AI & ML)</p>
                </div>
              </div>
            </div>

            <div className="social-links-container">
              <div className="social-item">
                <div className="social-icon">
                  <i className="fab fa-github"></i>
                </div>
                <div>
                  <h4>GitHub</h4>
                  <a href="https://github.com/MohitKumar-9090" target="_blank" rel="noreferrer">
                    MohitKumar-9090
                  </a>
                </div>
              </div>

              <div className="social-item">
                <div className="social-icon">
                  <i className="fab fa-linkedin"></i>
                </div>
                <div>
                  <h4>LinkedIn</h4>
                  <a
                    href="https://www.linkedin.com/in/mohit-kumar-391838346/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Mohit Pandey
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {projectModalOpen && (
        <div className="project-modal-overlay" onClick={closeProjectModal}>
          <div className="project-modal" onClick={(event) => event.stopPropagation()}>
            <div className="project-modal-header">
              <h3>Add New Project</h3>
              <button
                className="project-close-btn"
                onClick={closeProjectModal}
                aria-label="Close add project modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleAddProject}>
              <div className="form-group">
                <label className="form-label" htmlFor="projectTitle">
                  Project Title *
                </label>
                <input
                  id="projectTitle"
                  name="title"
                  type="text"
                  className="form-input"
                  placeholder="e.g. AI Interview Assistant"
                  value={projectForm.title}
                  onChange={handleProjectInput}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="projectCategory">
                  Category
                </label>
                <input
                  id="projectCategory"
                  name="category"
                  type="text"
                  className="form-input"
                  placeholder="Web App / AI / Full Stack"
                  value={projectForm.category}
                  onChange={handleProjectInput}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="projectDescription">
                  Description *
                </label>
                <textarea
                  id="projectDescription"
                  name="description"
                  className="form-textarea"
                  rows="4"
                  placeholder="Write a short and strong project summary"
                  value={projectForm.description}
                  onChange={handleProjectInput}
                ></textarea>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="projectStack">
                  Tech Stack (comma separated)
                </label>
                <input
                  id="projectStack"
                  name="stack"
                  type="text"
                  className="form-input"
                  placeholder="React, Firebase, Python"
                  value={projectForm.stack}
                  onChange={handleProjectInput}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="projectWebLink">
                  Web Page Link
                </label>
                <input
                  id="projectWebLink"
                  name="webLink"
                  type="url"
                  className="form-input"
                  placeholder="https://live-project..."
                  value={projectForm.webLink}
                  onChange={handleProjectInput}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="projectCodeLink">
                  Code Link (GitHub)
                </label>
                <input
                  id="projectCodeLink"
                  name="codeLink"
                  type="url"
                  className="form-input"
                  placeholder="https://github.com/..."
                  value={projectForm.codeLink}
                  onChange={handleProjectInput}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="projectImage">
                  Cover Image URL
                </label>
                <input
                  id="projectImage"
                  name="image"
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={projectForm.image}
                  onChange={handleProjectInput}
                />
              </div>
              <div className="project-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeProjectModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-plus"></i> Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="portfolio-chatbot">
        {!chatOpen && (
          <div className="chatbot-help-card">
            <p>
              <span role="img" aria-label="thinking face">
                🤔
              </span>{' '}
              Curious about Mohit? I’ve got the answers.
            </p>
          </div>
        )}

        {chatOpen && (
          <div className="chatbot-panel">
            <div className="chatbot-header">
              <strong>Mohit AI Assistant</strong>
              <button
                type="button"
                className="chatbot-close"
                onClick={() => setChatOpen(false)}
                aria-label="Close chatbot"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="chatbot-messages">
              {chatMessages.map((item) => (
                <div
                  key={item.id}
                  className={`chatbot-message ${item.role === 'user' ? 'user' : 'assistant'}`}
                >
                  {item.text}
                </div>
              ))}
              {chatLoading && <div className="chatbot-message assistant">Typing...</div>}
              <div ref={chatEndRef}></div>
            </div>

            <div className="chatbot-input-wrap">
              <input
                type="text"
                className="chatbot-input"
                placeholder="Ask about Mohit..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
              />
              <button
                type="button"
                className="chatbot-send"
                onClick={handleSendChat}
                disabled={chatLoading}
              >
                Send
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          className="chatbot-fab"
          onClick={() => setChatOpen((open) => !open)}
          aria-label="Open chatbot"
        >
          <i className="fa-regular fa-comment"></i>
        </button>
      </div>

      <section className="dashboard-highlight-cta" aria-label="Dashboard quick access">
        <div className="container dashboard-highlight-cta-content">
          <div>
            <h3>Need Portfolio Insights?</h3>
            <p>Open the analytics dashboard for visitors, GitHub activity, and performance summary.</p>
          </div>
          <a href="/dashboard" className="dashboard-highlight-btn">
            <i className="fas fa-chart-line"></i> Open Dashboard
          </a>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div>
              <div className="footer-logo">
                <img
                  src="https://ui-avatars.com/api/?name=MP&size=40&background=6366f1&color=fff&bold=true"
                  alt="MP Logo"
                  className="footer-logo-img"
                />
                <span>Mohit Pandey</span>
              </div>
              <p>AI & ML Developer building intelligent solutions with modern technologies.</p>
              <div className="footer-mini-icons">
                <a
                  href="https://github.com/MohitKumar-9090"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub"
                >
                  <i className="fab fa-github"></i>
                </a>
                <a href="mailto:mk9658173@gmail.com" aria-label="Email">
                  <i className="fas fa-envelope"></i>
                </a>
                <a href="tel:+917667615747" aria-label="Phone">
                  <i className="fas fa-phone"></i>
                </a>
                <a
                  href="https://maps.google.com/?q=Motihari,Bihar,India"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Location"
                >
                  <i className="fas fa-location-dot"></i>
                </a>
              </div>
            </div>

            <div>
              <h4>Quick Links</h4>
              <div className="footer-links">
                <a href="#home">Home</a>
                <a href="#about">About</a>
                <a href="#reviews">Reviews</a>
                <a href="#projects">Projects</a>
                <a href="#contact">Contact</a>
                <a href="/dashboard">Dashboard</a>
              </div>
            </div>

            <div>
              <h4>Technologies</h4>
              <div className="footer-links">
                <a href="#">Python</a>
                <a href="#">JavaScript</a>
                <a href="#">React</a>
                <a href="#">Firebase</a>
                <a href="#">Machine Learning</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© 2026 Mohit Pandey. All rights reserved.</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              <i className="fas fa-code"></i> Built with Firebase & EmailJS Integration
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Home;
