var urlValues = window.location.href;

// Remove the query string part after the '?' using split()
var urlWithoutQuery = urlValues.split("?")[0];

// Get the last part of the URL (the file name)
var lastPart = urlWithoutQuery.substring(urlWithoutQuery.lastIndexOf("/") + 1);

// Replace the .html extension with .md
lastPart = lastPart.replace(".html", ".md");

var fileName = lastPart;

let quill;

$(document).ready(function () {
  $('html').removeAttr('data-bs-theme');

  if (lastPart) {
    fileName = lastPart; 
    loadContent();
  }
});

//var urlParamss = new URLSearchParams(window.location.search);
var fileWithExtension = fileName;

marked.use({
  headerIds: false,
  mangle: false,
});

// Azure Repo Configs
const organization = "allresponsemedia";
const project = "ARMalytics";
const repository = "Prototypes";
const filePath = fileWithExtension;
const branch = "main";
const PAT =
  "CY6KRu70MLjHDWVbnFvB7RsRGOBjzbrZ2CCvN3MQCgdMeERrUajtJQQJ99BAACAAAAAIB2kwAAASAZDOXrsS";
const commitMessage = "Updated HElpDocs file";
let prevCommitID;

let htmlContent;
var turndownService = new TurndownService();

// Add a custom rule for iframe (YouTube videos)
turndownService.addRule("iframe", {
  filter: "iframe", // Target iframe tags
  replacement: function (content, node) {
    const src = node.getAttribute("src"); // Get the iframe's source URL
    if (src && src.includes("youtube.com/embed/")) {
      // Convert iframe to Markdown format for YouTube videos
      return `[![YouTube Video](https://img.youtube.com/vi/${
        src.split("/embed/")[1].split("?")[0]
      }/0.jpg)](${src})`;
    }
    return ""; // Return empty for non-YouTube iframes
  },
});

// Add a custom rule for <img> tags
turndownService.addRule("imgWithDimensions", {
  filter: "img",
  replacement: function (content, node) {
    const src = node.getAttribute("src") || "";
    const alt = node.getAttribute("alt") || "";
    const width = node.getAttribute("width") || "";
    const height = node.getAttribute("height") || "";

    // Format dimensions as metadata
    const dimensions = [];
    if (width) dimensions.push(`width=${width}`);
    if (height) dimensions.push(`height=${height}`);
    const dimensionText =
      dimensions.length > 0 ? ` (${dimensions.join(", ")})` : "";

    // Return Markdown image syntax
    return `![${alt}](${src})${dimensionText}`;
  },
});

// Add custom rule for ql-size-small (maps to # heading in Markdown)
turndownService.addRule("size-small", {
  filter: function (node) {
    return (
      (node.nodeName === "SPAN" || node.nodeName === "STRONG") &&
      node.classList.contains("ql-size-small")
    );
  },
  replacement: function (content) {
    return `### ${content}`; // Markdown for size-small: # text
  },
});

// Add custom rule for ql-size-large (maps to ## heading in Markdown)
turndownService.addRule("size-large", {
  filter: function (node) {
    return (
      (node.nodeName === "SPAN" || node.nodeName === "STRONG") &&
      node.classList.contains("ql-size-large")
    );
  },
  replacement: function (content) {
    return `## ${content}`; // Markdown for size-large: ## text
  },
});

// Add custom rule for ql-size-huge (maps to ### heading in Markdown)
turndownService.addRule("size-huge", {
  filter: function (node) {
    return (
      (node.nodeName === "SPAN" || node.nodeName === "STRONG") &&
      node.classList.contains("ql-size-huge")
    );
  },
  replacement: function (content) {
    return `# ${content}`; // Markdown for size-huge: ### text
  },
});

// Add custom rule for <u> tag (underline to Markdown with _text_)
turndownService.addRule("underline", {
  filter: "u",
  replacement: function (content) {
    return `_${content}_`; // Markdown for underline: _text_
  },
});

turndownService.addRule("size-classes", {
  filter: (node) => {
    // Check if the node has any of the size classes
    return (
      node.nodeType === 1 &&
      (node.classList.contains("ql-size-small") ||
        node.classList.contains("ql-size-large") ||
        node.classList.contains("ql-size-huge"))
    );
  },
  replacement: (content, node) => {
    // Remove any existing leading # followed by space before adding the new size class mark
    const cleanContent = content.replace(/^#\s*/, ""); // Remove any # and spaces from the start

    // Check the class and add appropriate heading mark
    if (node.classList.contains("ql-size-small")) {
      return `### ${cleanContent}`; // Corresponds to ### in markdown
    } else if (node.classList.contains("ql-size-large")) {
      return `## ${cleanContent}`; // Corresponds to ## in markdown
    } else if (node.classList.contains("ql-size-huge")) {
      return `# ${cleanContent}`; // Corresponds to # in markdown
    }
  },
});

// Add custom rule for headers
turndownService.addRule("header1", {
  filter: "h1",
  replacement: function (content) {
    return "# " + content; // Converts <h1> to Markdown #
  },
});

turndownService.addRule("header2", {
  filter: "h2",
  replacement: function (content) {
    return "## " + content; // Converts <h2> to Markdown ##
  },
});

turndownService.addRule("header3", {
  filter: "h3",
  replacement: function (content) {
    return "### " + content; // Converts <h3> to Markdown ###
  },
});

// Add custom rule to handle <strong> (bold to Markdown with **text**)
turndownService.addRule("strong", {
  filter: "strong",
  replacement: function (content) {
    return `**${content}**`; // Markdown for strong: **text**
  },
});

function initQuill() {
  const quillContainer = document.getElementById("quill-container");
  const editor = document.getElementById("editor");
  if (!quill) {
    quill = new Quill(editor, {
      theme: "snow",
      modules: {
        imageResize: {}, // Enable the imageResize module
        toolbar: [
          ["bold", "italic", "underline", "strike"], // text formatting
          ["blockquote", "code-block"], // block elements
          [{ list: "ordered" }, { list: "bullet" }], // lists
          [{ script: "sub" }, { script: "super" }], // subscript/superscript
          [{ indent: "-1" }, { indent: "+1" }], // indentation
          [{ align: [] }], // alignment
          ["link", "image", "video"], // media
          [{ color: [] }, { background: [] }], // text colors
          [{ font: [] }], // fonts
          [{ size: [] }], // font size
          [{ header: "1" }, { header: "2" }, { header: "3" }], // header options
        ],
      },
      placeholder: "Add Content",
    });
  }
}

initQuill();

// Track and log image dimensions when resized
quill.root.addEventListener("resize", function (event) {
  const images = quill.root.querySelectorAll("img");
  images.forEach((image) => {
    // Get the current size of the image
    const width = image.width;
    const height = image.height;

    // Update the img tag's width and height attributes
    image.setAttribute("width", width);
    image.setAttribute("height", height);
  });
});

function GetFileDetails() {
  const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repository}/items?scopePath=/&recursionLevel=OneLevel&api-version=7.1`;

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Basic " + btoa(":" + PAT), // Replace with your PAT
  };

  $.ajax({
    url: url,
    type: "GET",
    headers: headers,
    success: function (response) {
      if (response) {
        try {
          const readmeObject = response.value.find(
            (item) => item.path === "/" + filePath
          );
          prevCommitID = readmeObject.commitId;
        } catch (e) {
          console.error("Error decoding base64 content:", e);
        }
      } else {
        console.log("File Content:", response);
      }
    },
    error: function (xhr, status, error) {
      console.error("Error fetching file content:", xhr.responseText);
    },
  });
}

GetFileDetails();

function loadReadme() {
  const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repository}/items?path=${fileName}&api-version=7.1`;

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Basic " + btoa(":" + PAT), // Replace with your PAT
  };

  $.ajax({
    url: url,
    type: "GET",
    headers: headers,
    success: function (response) {
      if (response) {
        try {
          // Function to preprocess markdown before conversion
          const preprocessMarkdown = (markdown) => {
            // Handle image and width transformation
            markdown = markdown.replace(
              /!\[([^\]]*)\]\(([^)]+)\)\s?\(width=(\d+)\)/g,
              (match, altText, url, width) => {
                return `<p><img src="${url}" width="${width}" alt="${altText}" /></p>`;
              }
            );

            // Handle the combination of **_..._** (bold + italic) and convert it to <strong><u>...</u></strong>
            markdown = markdown.replace(
              /\*\*_(.*?)_\*\*/g,
              (match, content) => {
                return `<strong><u>${content}</u></strong>`;
              }
            );

            return markdown;
          };

          // Function to convert Markdown to HTML
          const convertMarkdownToHTML = (markdown) => {
            // Preprocess Markdown (handle images, width, and **_..._** transformation)
            const preprocessedMarkdown = preprocessMarkdown(markdown);

            // Convert using marked.js
            const html = marked.parse(preprocessedMarkdown);

            // Post-process HTML to ensure headers are bold (using <strong> inside headers)
            const postProcessedHtml = html.replace(
              /<(h[1-6])>(.*?)<\/\1>/g,
              (match, tag, content) => {
                return `<${tag}><strong>${content}</strong></${tag}>`;
              }
            );

            // Ensure content after image goes to the next paragraph
            return postProcessedHtml;
          };

          var data = convertMarkdownToHTML(response);
          // Example usage with Quill
          //quill.clipboard.dangerouslyPasteHTML(convertMarkdownToHTML(response));

          // quill.root.innerHTML = convertMarkdownToHTML(response);
          quill.clipboard.dangerouslyPasteHTML(data);
        } catch (e) {
          console.error("Error decoding base64 content:", e);
        }
      } else {
        console.log("File Content:", response);
      }
    },
    error: function (xhr, status, error) {
      console.error("Error fetching file content:", xhr.responseText);
    },
  });
  // console.log("html", data);
  // return htmlContent;
}

function loadContent() {
    $("#spinner").show();
  const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repository}/items?path=${fileName}&api-version=7.1`;

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Basic " + btoa(":" + PAT), // Replace with your PAT
  };

  $.ajax({
    url: url,
    type: "GET",
    headers: headers,
    success: function (response) {
      if (response) {
        try {
          // Function to preprocess markdown before conversion
          const preprocessMarkdown = (markdown) => {
            // Handle image and width transformation
            markdown = markdown.replace(
              /!\[([^\]]*)\]\(([^)]+)\)\s?\(width=(\d+)\)/g,
              (match, altText, url, width) => {
                return `<p><img src="${url}" width="${width}" alt="${altText}" /></p>`;
              }
            );

            // Handle the combination of **_..._** (bold + italic) and convert it to <strong><u>...</u></strong>
            markdown = markdown.replace(
              /\*\*_(.*?)_\*\*/g,
              (match, content) => {
                return `<strong><u>${content}</u></strong>`;
              }
            );

            return markdown;
          };

          // Function to convert Markdown to HTML
          const convertMarkdownToHTML = (markdown) => {
            // Preprocess Markdown (handle images, width, and **_..._** transformation)
            const preprocessedMarkdown = preprocessMarkdown(markdown);

            // Convert using marked.js
            const html = marked.parse(preprocessedMarkdown);

            // Post-process HTML to ensure headers are bold (using <strong> inside headers)
            const postProcessedHtml = html.replace(
              /<(h[1-6])>(.*?)<\/\1>/g,
              (match, tag, content) => {
                return `<${tag}><strong>${content}</strong></${tag}>`;
              }
            );

            // Ensure content after image goes to the next paragraph
            return postProcessedHtml;
          };

          var data = convertMarkdownToHTML(response);

          document.getElementById("_content").innerHTML = data;
          $("#spinner").hide();
        } catch (e) {
          console.error("Error decoding base64 content:", e);
        }
      } else {
        $("#spinner").hide();
        console.log("File Content:", response);
      }
    },
    error: function (xhr, status, error) {
    $("#spinner").hide();
      console.error("Error fetching file content:", xhr.responseText);
    },
  });
  // console.log("html", data);
  // return htmlContent;
}

function editContent(button) {
  const contentElement = document.getElementById("_content");
  const htmlData = document.getElementById("_content").innerHTML;
  console.log("Data",htmlData);
  if (contentElement && htmlData) {
    contentElement.style.display = "none"; // Hide _content
  }

  // Show Quill editor and set its content
  const quillContainer = document.getElementById("quill-container");
  quillContainer.style.display = "block";

  // Ensure Quill is initialized and bind the content
  if (!quill) {
    initQuill(); // Initialize Quill if not done yet
  }

  // You may want to call loadReadme here if you expect to load some specific markdown content from a file
  //loadReadme(); // If necessary, uncomment this

  // Use Quill's API to set the content (this assumes the content is HTML)
    //quill.root.innerHTML = htmlData;
  quill.clipboard.dangerouslyPasteHTML(htmlData);
}

function cancelEditing() {
  const contentElement = document.getElementById("_content");
  if (contentElement) {
    contentElement.style.display = "block"; // Hide _content
  }

  const quillContainer = document.getElementById("quill-container");
  quillContainer.style.display = "none";
}

// Function to commit changes to the README file
function commitToAzure() {
  var content;

  if (fileWithExtension.toLowerCase().endsWith(".html")) {
    var editorContent = quill.root.innerHTML;
    content = editorContent;
  } else {
    var editorContent = quill.root.innerHTML;

    content = turndownService.turndown(editorContent);
  }


  const url = `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repository}/pushes?api-version=7.1`;

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Basic " + btoa(":" + PAT),
  };

  // Prepare the commit data
  const requestData = {
    refUpdates: [
      {
        name: `refs/heads/${branch}`,
        oldObjectId: prevCommitID, //  empty commit ID for new commit only
      },
    ],
    commits: [
      {
        comment: "Updated " + fileWithExtension + " file.",
        changes: [
          {
            changeType: "edit",
            item: {
              path: "/" + fileWithExtension,
            },
            newContent: {
              content: content,
              contentType: "rawtext",
            },
          },
        ],
      },
    ],
  };

  //Send AJAX request to commit changes
  $.ajax({
    url: url,
    type: "POST",
    headers: headers,
    data: JSON.stringify(requestData),
    success: function (response) {
      alert("Changes updated successfully!");
      window.location.reload();
    },
    error: function (xhr, status, error) {
      alert("Failed to commit changes.");
    },
  });
}

// Trigger the commit on button click
$("#commitChangesButton").on("click", function () {
  commitToAzure();
});


$(document).ready(function () {
    // Get the current URL
    const currentUrl = window.location.href;

    // Check if the URL is the home URL (without params or routes)
    const isHome = currentUrl === "https://localhost:8080/" || currentUrl === "http://localhost:8080/" || currentUrl === "https://brian-d2367.github.io/ARMalyticsHelp/" || currentUrl === "http://brian-d2367.github.io/ARMalyticsHelp/";

    // Find all divs with the class 'targetDiv'
    const targetDivs = document.querySelectorAll(".targetDiv");

    // Hide all divs if it's the home URL
    if (isHome && targetDivs.length > 0) {
      targetDivs.forEach(div => {
        div.style.display = "none";
      });
    }


    if (lastPart) {
      fileName = lastPart; // Get the value of fileName
      console.log("FileName", fileName);
      loadContent();
    }
  });
