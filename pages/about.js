import Image from 'next/image';

export default function About() {
  return (
    <div className="about-page">
      <section className="about-section">
        <Image
          src="/images/about/judith-headshot.jpg"
          alt="Judith headshot"
          width={400}
          height={500}
          priority
        />
        {/* Add your about content here */}
      </section>
    </div>
  );
}
