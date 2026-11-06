import fitz

# Open your PDF
doc = fitz.open("original.pdf")

# Select the first page
page = doc[0]

# Add new text
page.insert_text(
    (100, 150),
    "This is my edited PDF!",
    fontsize=18,
    color=(1, 0, 0)
)

# Save the edited PDF
doc.save("output/edited.pdf")

print("PDF editing completed!")