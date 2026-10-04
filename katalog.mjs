// Themen und Motive. `prompt` beschreibt nur das Motiv; der Stil wird in gen.sh ergänzt.
export const themen = [
  {
    slug: "einhorn", name: "Einhorn", titel: "Einhorn Ausmalbilder",
    intro: "Einhörner gehören zu den beliebtesten Motiven überhaupt. Hier gibt es drei verträumte Einhorn-Ausmalbilder mit Regenbogen, Sternen und Blumenwiese – zum kostenlosen Ausdrucken.",
    bilder: [
      { slug: "einhorn-regenbogen", titel: "Einhorn mit Regenbogen", alt: "Einhorn auf einer Blumenwiese mit Regenbogen und lächelnden Wolken", prompt: "a cute unicorn standing in a meadow with flowers and a rainbow with smiling clouds" },
      { slug: "einhorn-sterne", titel: "Fliegendes Einhorn mit Sternen", alt: "Einhorn mit Flügeln fliegt zwischen Sternen und Mond", prompt: "a cute winged unicorn flying through the night sky with a crescent moon and big stars" },
      { slug: "einhorn-baby", titel: "Baby-Einhorn mit Mama", alt: "Einhorn-Mama und Baby-Einhorn kuscheln zwischen Herzen", prompt: "a mother unicorn and a baby unicorn cuddling together, surrounded by a few hearts and flowers" },
    ],
  },
  {
    slug: "dinosaurier", name: "Dinosaurier", titel: "Dinosaurier Ausmalbilder",
    intro: "Ob T-Rex, Langhals oder Triceratops: Diese Dinosaurier-Ausmalbilder sind freundlich gezeichnet und haben große Flächen, die schon Kindergartenkinder gut ausmalen können.",
    bilder: [
      { slug: "dino-t-rex", titel: "Freundlicher T-Rex", alt: "Lachender Tyrannosaurus Rex zwischen Palmen und Vulkan", prompt: "a friendly smiling Tyrannosaurus rex standing between palm trees with a volcano in the background" },
      { slug: "dino-langhals", titel: "Langhals-Dinosaurier", alt: "Brachiosaurus frisst Blätter von einem hohen Baum", prompt: "a gentle long-necked brachiosaurus eating leaves from a tall tree, with ferns at its feet" },
      { slug: "dino-ei", titel: "Dino-Baby schlüpft", alt: "Kleiner Triceratops schlüpft aus einem Ei im Nest", prompt: "a baby triceratops hatching out of a cracked egg in a nest, other eggs around, cute style" },
    ],
  },
  {
    slug: "pferde", name: "Pferde", titel: "Pferde Ausmalbilder",
    intro: "Pferde-Ausmalbilder für kleine und große Pferdefans: ein Fohlen auf der Weide, ein Pony mit geflochtener Mähne und ein Pferd beim Springen.",
    bilder: [
      { slug: "pferd-fohlen", titel: "Pferd mit Fohlen", alt: "Stute und Fohlen auf der Weide am Zaun", prompt: "a horse mare and her foal standing in a pasture next to a wooden fence, with trees and hills" },
      { slug: "pferd-pony", titel: "Pony mit Zöpfen", alt: "Pony mit geflochtener Mähne und Schleifen", prompt: "a sweet pony with braided mane decorated with bows, standing near a stable, front three-quarter view" },
      { slug: "pferd-springen", titel: "Pferd beim Springen", alt: "Pferd springt über ein Hindernis", prompt: "a horse jumping over a show jumping obstacle with poles, no rider, dynamic but simple" },
    ],
  },
  {
    slug: "tiere", name: "Haustiere", titel: "Tiere Ausmalbilder: Katze, Hund & Hase",
    intro: "Katze, Hund und Hase: Haustiere sind ein Klassiker zum Ausmalen. Die Bilder sind einfach gehalten und eignen sich besonders für Kinder ab 3 Jahren.",
    bilder: [
      { slug: "katze-wollknaeuel", titel: "Katze mit Wollknäuel", alt: "Junge Katze spielt mit einem Wollknäuel", prompt: "a playful kitten playing with a ball of yarn on a rug" },
      { slug: "hund-knochen", titel: "Hund mit Knochen", alt: "Fröhlicher Hund sitzt mit Knochen vor seiner Hundehütte", prompt: "a happy puppy sitting in front of its dog house with a bone and a plain empty food bowl, no sign and no name plate on the dog house" },
      { slug: "hase-karotte", titel: "Hase mit Karotte", alt: "Hase knabbert an einer Karotte im Gemüsebeet", prompt: "a cute rabbit holding a carrot in a vegetable garden" },
    ],
  },
  {
    slug: "meerjungfrau", name: "Meerjungfrau", titel: "Meerjungfrau Ausmalbilder",
    intro: "Unterwasser-Märchen zum Ausmalen: Meerjungfrauen mit Muscheln, Fischen und Seepferdchen – eigene Zeichnungen, keine bekannten Filmfiguren.",
    bilder: [
      { slug: "meerjungfrau-fels", titel: "Meerjungfrau auf dem Felsen", alt: "Meerjungfrau sitzt auf einem Felsen im Meer, Wellen und Möwen", prompt: "a young mermaid girl sitting on a rock in the sea with waves and seagulls, original character" },
      { slug: "meerjungfrau-fische", titel: "Meerjungfrau mit Fischen", alt: "Meerjungfrau schwimmt mit Fischen zwischen Korallen", prompt: "a young mermaid swimming with friendly fish among corals and seaweed, original character" },
      { slug: "meerjungfrau-seepferdchen", titel: "Meerjungfrau mit Seepferdchen", alt: "Meerjungfrau mit Seepferdchen und Muschelschatz", prompt: "a little mermaid with a seahorse friend and an open seashell with a pearl, original character" },
    ],
  },
  {
    slug: "fahrzeuge", name: "Fahrzeuge", titel: "Fahrzeuge Ausmalbilder: Feuerwehr, Bagger & Traktor",
    intro: "Tatütata! Feuerwehrauto, Bagger und Traktor sind die Lieblingsfahrzeuge vieler Kinder. Diese Ausmalbilder haben klare Linien und große Flächen.",
    bilder: [
      { slug: "feuerwehrauto", titel: "Feuerwehrauto", alt: "Feuerwehrauto mit Leiter und Wasserschlauch", prompt: "a fire truck with a ladder and a water hose, side view, no logos, no text" },
      { slug: "bagger", titel: "Bagger auf der Baustelle", alt: "Bagger hebt Erde auf einer Baustelle mit Pylonen", prompt: "an excavator digging dirt on a construction site with traffic cones, no logos, no text" },
      { slug: "traktor", titel: "Traktor mit Anhänger", alt: "Traktor zieht einen Anhänger mit Heuballen", prompt: "a farm tractor pulling a trailer loaded with hay bales on a country road, no logos, no text" },
    ],
  },
  {
    slug: "bauernhof", name: "Bauernhof", titel: "Bauernhof Ausmalbilder",
    intro: "Auf dem Bauernhof ist was los: Kuh, Schwein, Hühner und die rote Scheune warten darauf, bunt gemalt zu werden.",
    bilder: [
      { slug: "bauernhof-scheune", titel: "Scheune mit Tieren", alt: "Bauernhof mit Scheune, Kuh, Schwein und Huhn", prompt: "a farm scene with a barn, a cow, a pig and a chicken, sun in the sky" },
      { slug: "kuh", titel: "Kuh auf der Wiese", alt: "Lächelnde Kuh mit Glocke auf einer Blumenwiese", prompt: "a smiling cow with a bell standing in a flower meadow" },
      { slug: "huehner", titel: "Henne mit Küken", alt: "Henne mit Küken neben einem Nest mit Eiern", prompt: "a mother hen with fluffy chicks next to a straw nest with eggs" },
    ],
  },
  {
    slug: "weltraum", name: "Weltraum", titel: "Weltraum Ausmalbilder",
    intro: "Raketen, Planeten und Astronautinnen: Weltraum-Ausmalbilder für kleine Entdecker, die von den Sternen träumen.",
    bilder: [
      { slug: "rakete", titel: "Rakete im All", alt: "Rakete fliegt an Planeten und Sternen vorbei", prompt: "a rocket flying through space past planets with rings and stars" },
      { slug: "astronaut", titel: "Astronaut auf dem Mond", alt: "Kind im Raumanzug winkt auf dem Mond, Erde im Hintergrund", prompt: "a child astronaut in a spacesuit waving on the moon surface with craters, planet Earth in the sky, a flag without any symbol" },
      { slug: "ufo-alien", titel: "Freundliches Alien", alt: "Freundliches Alien winkt aus einer fliegenden Untertasse", prompt: "a friendly cute alien waving from a flying saucer above a small planet" },
    ],
  },
  {
    slug: "unterwasser", name: "Unterwasser", titel: "Unterwasser & Meerestiere Ausmalbilder",
    intro: "Wal, Schildkröte und Krake: Meerestiere zum Ausmalen, mit Korallen, Blasen und Seetang.",
    bilder: [
      { slug: "schildkroete", titel: "Meeresschildkröte", alt: "Meeresschildkröte schwimmt über ein Korallenriff", prompt: "a sea turtle swimming above a coral reef with bubbles" },
      { slug: "wal", titel: "Wal mit Fontäne", alt: "Lächelnder Wal spritzt Wasser aus dem Blasloch", prompt: "a smiling whale spouting water from its blowhole, waves and a small boat" },
      { slug: "krake", titel: "Kleiner Oktopus", alt: "Oktopus mit acht Armen zwischen Muscheln und Seesternen", prompt: "a cute octopus waving its arms among shells, starfish and seaweed" },
    ],
  },
  {
    slug: "herbst", name: "Herbst", titel: "Herbst Ausmalbilder",
    intro: "Bunte Blätter, Igel und Drachensteigen: Herbst-Ausmalbilder für Kita, Schule und gemütliche Nachmittage zu Hause.",
    bilder: [
      { slug: "igel-laub", titel: "Igel im Laub", alt: "Igel mit Apfel auf dem Rücken im Herbstlaub", prompt: "a hedgehog carrying an apple on its spines in a pile of autumn leaves with mushrooms" },
      { slug: "drachen-steigen", titel: "Drachen steigen lassen", alt: "Kind lässt einen Drachen über einem Feld steigen", prompt: "a child flying a kite on a windy autumn hill with falling leaves" },
      { slug: "eichhoernchen", titel: "Eichhörnchen mit Nuss", alt: "Eichhörnchen hält eine Nuss auf einem Ast mit Eicheln", prompt: "a squirrel holding a nut sitting on a tree branch with acorns and oak leaves" },
    ],
  },
  {
    slug: "halloween", name: "Halloween", titel: "Halloween Ausmalbilder",
    intro: "Gruselig, aber nicht zu sehr: Halloween-Ausmalbilder mit Kürbis, kleinem Gespenst und Hexenkatze – passend für Kinder.",
    bilder: [
      { slug: "kuerbis", titel: "Lachender Kürbis", alt: "Geschnitzter Kürbis mit lachendem Gesicht, Fledermäuse und Mond", prompt: "a carved jack-o-lantern pumpkin with a friendly smile, bats and a full moon, not scary" },
      { slug: "gespenst", titel: "Kleines Gespenst", alt: "Freundliches kleines Gespenst vor einem alten Haus", prompt: "a cute friendly little ghost floating in front of an old house with a crooked fence, not scary" },
      { slug: "hexe-katze", titel: "Hexenkatze auf dem Besen", alt: "Katze mit Hexenhut fliegt auf einem Besen am Mond vorbei", prompt: "a cute cat wearing a witch hat flying on a broomstick past the moon, not scary" },
    ],
  },
  {
    slug: "sankt-martin", name: "Sankt Martin", titel: "Sankt Martin & Laternen Ausmalbilder",
    intro: "Ich geh mit meiner Laterne: Ausmalbilder zu Sankt Martin und zum Laternenumzug im November.",
    bilder: [
      { slug: "martin-mantel", titel: "Sankt Martin teilt den Mantel", alt: "Reiter auf einem Pferd teilt seinen Mantel mit einem Bettler im Schnee", prompt: "Saint Martin on horseback cutting his cloak in half with a sword to share with a poor man sitting in the snow, gentle storybook style" },
      { slug: "laternenumzug", titel: "Laternenumzug", alt: "Kinder gehen mit Laternen durch die Nacht", prompt: "children walking in a lantern parade at night holding paper lanterns on sticks, moon and stars" },
      { slug: "laternen", titel: "Laternen zum Ausmalen", alt: "Drei Laternen: Mond, Sonne und Igel", prompt: "three paper lanterns hanging on sticks: one shaped like a moon, one like a sun, one like a hedgehog" },
    ],
  },
  {
    slug: "weihnachten", name: "Weihnachten", titel: "Weihnachten Ausmalbilder",
    intro: "Tannenbaum, Weihnachtsmann und Schneemann: Weihnachts-Ausmalbilder für die Adventszeit.",
    bilder: [
      { slug: "tannenbaum", titel: "Geschmückter Tannenbaum", alt: "Weihnachtsbaum mit Kugeln, Stern und Geschenken", prompt: "a decorated Christmas tree with baubles and a star on top, gifts underneath" },
      { slug: "weihnachtsmann", titel: "Weihnachtsmann mit Rentier", alt: "Weihnachtsmann mit Geschenkesack und Rentier im Schnee", prompt: "Santa Claus with a sack of presents next to a reindeer in the snow" },
      { slug: "schneemann", titel: "Schneemann", alt: "Schneemann mit Schal, Mütze und Karottennase", prompt: "a happy snowman with scarf, hat and carrot nose, snowflakes and small houses" },
    ],
  },
  {
    slug: "ostern", name: "Ostern", titel: "Ostern Ausmalbilder",
    intro: "Osterhase, Ostereier und Küken: Ausmalbilder für den Osterkorb und die Osterdeko.",
    bilder: [
      { slug: "osterhase", titel: "Osterhase mit Korb", alt: "Osterhase trägt einen Korb voller Ostereier", prompt: "an Easter bunny carrying a basket full of decorated Easter eggs in a spring meadow" },
      { slug: "ostereier", titel: "Ostereier zum Verzieren", alt: "Sechs große Ostereier mit Mustern", prompt: "six large Easter eggs with different simple patterns (stripes, dots, zigzag, flowers) filling the whole page, stacked in a big woven basket on grass with spring flowers" },
      { slug: "kueken-ei", titel: "Küken im Ei", alt: "Küken schaut aus einem Ei zwischen Tulpen", prompt: "a little chick peeking out of a cracked eggshell between tulips" },
    ],
  },
  {
    slug: "mandala", name: "Mandala", titel: "Mandala Ausmalbilder für Kinder",
    intro: "Mandalas beruhigen und fördern die Feinmotorik. Diese drei Mandalas sind kindgerecht: mit Tieren, Blumen und Sternen.",
    bilder: [
      { slug: "mandala-blume", titel: "Blumen-Mandala", alt: "Rundes Mandala aus Blüten und Blättern", prompt: "a circular symmetric flower mandala with petals and leaves, medium detail suitable for children aged 6-10, centered on the page" },
      { slug: "mandala-tiere", titel: "Tier-Mandala", alt: "Rundes Mandala mit Schmetterlingen und Marienkäfern", prompt: "a circular symmetric mandala made of butterflies, ladybugs and leaves, medium detail for children, centered" },
      { slug: "mandala-stern", titel: "Sternen-Mandala", alt: "Rundes Mandala mit Sternen und Monden", prompt: "a circular symmetric mandala with stars and crescent moons, medium detail for children, centered" },
    ],
  },
  {
    slug: "maerchen", name: "Ritter & Prinzessin", titel: "Ritter, Prinzessin & Drachen Ausmalbilder",
    intro: "Märchenhafte Ausmalbilder: eine Burg, ein freundlicher Drache und Prinzessin und Ritter – alles eigene Figuren.",
    bilder: [
      { slug: "burg", titel: "Märchenburg", alt: "Burg mit Türmen, Fahnen und Zugbrücke", prompt: "a fairy tale castle with towers, flags without symbols, a drawbridge and a moat" },
      { slug: "drache", titel: "Freundlicher Drache", alt: "Kleiner lächelnder Drache sitzt auf einem Schatz", prompt: "a small friendly smiling dragon sitting on a pile of treasure coins" },
      { slug: "prinzessin-ritter", titel: "Prinzessin und Ritter", alt: "Prinzessin und kleiner Ritter mit Holzschwert vor einer Burg", prompt: "a little princess with a crown and a little knight with a wooden sword standing together in front of a castle, original characters" },
    ],
  },
  {
    slug: "natur", name: "Blumen & Schmetterlinge", titel: "Blumen & Schmetterlinge Ausmalbilder",
    intro: "Frühling zum Ausmalen: Schmetterlinge, Sonnenblumen und Marienkäfer – mal einfach, mal etwas detaillierter.",
    bilder: [
      { slug: "schmetterling", titel: "Großer Schmetterling", alt: "Großer Schmetterling mit verzierten Flügeln über Blumen", prompt: "a large butterfly with ornate patterned wings above a few flowers" },
      { slug: "sonnenblumen", titel: "Sonnenblumen", alt: "Drei Sonnenblumen mit Biene", prompt: "three tall sunflowers with a bee flying nearby" },
      { slug: "marienkaefer", titel: "Marienkäfer auf dem Blatt", alt: "Marienkäfer sitzt auf einem großen Blatt mit Tautropfen", prompt: "a cute ladybug sitting on a big leaf with dew drops and small flowers" },
    ],
  },
];
