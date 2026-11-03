<?php
/**
 * @copyright  (C) 2026 COLORPACK CREATION CO., LTD.
 * @license    GNU General Public License version 2 or later
 */

namespace Colorpack\Plugin\Content\Colorpackembed\Extension;

\defined('_JEXEC') or die;

use Joomla\CMS\Plugin\CMSPlugin;

/**
 * Text Filters remove iframes when some user groups save. This restores YouTube and Vimeo players
 * at display time from the figure's address. Only addresses of those two services ever produce an iframe.
 */
final class Colorpackembed extends CMSPlugin
{
	public function onContentPrepare($context, &$article, &$params, $page = 0)
	{
		if (!isset($article->text) || strpos($article->text, 'editorjs-embed') === false)
		{
			return;
		}

		$article->text = preg_replace_callback('#<figure\b[^>]*\bclass="editorjs-embed"[^>]*>(.*?)</figure>#si', [$this, 'restore'], $article->text);
	}

	private function restore(array $m): string
	{
		if (stripos($m[1], '<iframe') !== false || !preg_match('#\bdata-source="([^"]*)"#i', $m[0], $source))
		{
			return $m[0];
		}

		$video = self::parse(html_entity_decode($source[1], ENT_QUOTES, 'UTF-8'));

		if (!$video)
		{
			return $m[0];
		}

		[$src, $w, $h, $title] = $video;
		$iframe = '<iframe src="' . htmlspecialchars($src, ENT_QUOTES, 'UTF-8') . '" title="' . $title . '" width="' . $w . '" height="' . $h . '"'
			. ' style="display:block;width:100%;height:auto;aspect-ratio:' . $w . '/' . $h . ';border:0"'
			. ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"'
			. ' referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>';

		return preg_replace('#^(<figure\b[^>]*>)#i', '$1' . str_replace(['\\', '$'], ['\\\\', '\\$'], $iframe), $m[0], 1);
	}

	/**
	 * Same rules as the editor's parseVideoUrl().
	 *
	 * @return  array|null  [embed URL, width, height, title]
	 */
	public static function parse(string $url): ?array
	{
		$parts = parse_url(trim($url));

		if (!$parts || !\in_array($parts['scheme'] ?? '', ['http', 'https'], true) || empty($parts['host']))
		{
			return null;
		}

		$host = preg_replace('/^www\./', '', strtolower($parts['host']));
		$path = array_values(array_filter(explode('/', $parts['path'] ?? '')));
		parse_str($parts['query'] ?? '', $q);

		if (\in_array($host, ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'youtu.be'], true))
		{
			$id     = null;
			$shorts = false;

			if ($host === 'youtu.be')
			{
				$id = $path[0] ?? null;
			}
			elseif (($path[0] ?? '') === 'watch')
			{
				$id = $q['v'] ?? null;
			}
			elseif (\in_array($path[0] ?? '', ['shorts', 'live', 'embed', 'v'], true))
			{
				$id     = $path[1] ?? null;
				$shorts = $path[0] === 'shorts';
			}

			$id   = $id === 'videoseries' ? null : $id;
			$list = \is_string($q['list'] ?? null) && preg_match('/^[A-Za-z0-9_-]{2,64}$/', $q['list']) ? $q['list'] : null;

			if (($id !== null && (!\is_string($id) || !preg_match('/^[A-Za-z0-9_-]{6,20}$/', $id))) || ($id === null && $list === null))
			{
				return null;
			}

			$query = [];

			if ($list)
			{
				$query['list'] = $list;
			}

			if ($start = self::seconds($q['t'] ?? $q['start'] ?? ''))
			{
				$query['start'] = $start;
			}

			return [
				'https://www.youtube-nocookie.com/embed/' . ($id ?? 'videoseries') . ($query ? '?' . http_build_query($query) : ''),
				$shorts ? 315 : 560,
				$shorts ? 560 : 315,
				'YouTube video',
			];
		}

		if ($host === 'vimeo.com' || $host === 'player.vimeo.com')
		{
			$ids = $host === 'vimeo.com' ? $path : \array_slice($path, 1);

			if (!preg_match('/^\d+$/', $ids[0] ?? ''))
			{
				return null;
			}

			$hash = $ids[1] ?? ($q['h'] ?? '');
			$hash = \is_string($hash) && preg_match('/^[a-f0-9]{6,}$/i', $hash) ? '?h=' . $hash : '';

			return ['https://player.vimeo.com/video/' . $ids[0] . $hash, 640, 360, 'Vimeo video'];
		}

		return null;
	}

	private static function seconds($value): int
	{
		if (!\is_string($value))
		{
			return 0;
		}

		if (ctype_digit($value))
		{
			return (int) $value;
		}

		return preg_match('/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i', $value, $m)
			? ((int) ($m[1] ?? 0)) * 3600 + ((int) ($m[2] ?? 0)) * 60 + (int) ($m[3] ?? 0)
			: 0;
	}
}
